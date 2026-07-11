import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { TOOLS, WRITE_TOOLS, toOpenAITools, describeAction, systemPrompt } from "@/lib/ai/tools";
import { executeTool } from "@/lib/ai/execute";

const YES = ["yes", "yeah", "yep", "confirm", "go ahead", "do it", "sure", "ok", "okay", "correct", "haan", "ha"];
const NO = ["no", "nope", "cancel", "stop", "don't", "dont", "nahi", "negative"];

type Pending = { messages: any[]; toolUseId: string; name: string; input: any };

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "No profile found." }, { status: 400 });

  const [{ data: company }, { data: aiSettings }] = await Promise.all([
    supabase.from("companies").select("name").eq("id", profile.company_id).single(),
    supabase.from("ai_settings").select("*").eq("company_id", profile.company_id).maybeSingle(),
  ]);

  const provider = aiSettings?.provider || "anthropic";
  const apiKey = aiSettings?.api_key || process.env.ANTHROPIC_API_KEY || "";
  const model = aiSettings?.model || "claude-sonnet-5";
  const baseUrl = aiSettings?.base_url || "";

  if (!apiKey) {
    return NextResponse.json({
      speak:
        "Sarthiwala AI isn't set up yet. Ask an admin to add an API key under Company Settings → Sarthiwala AI.",
      awaitingConfirmation: false,
      history: [],
      pending: null,
      needsKey: true,
    });
  }

  const body = await req.json();
  const text: string = body.text || "";
  let history: any[] = body.history || [];
  let pending: Pending | null = body.pending || null;

  const companyName = company?.name || "your company";

  try {
    if (pending) {
      return NextResponse.json(
        await handleConfirmation(provider, apiKey, model, baseUrl, companyName, supabase, profile.company_id, user.id, pending, text)
      );
    }
    const messages = [...history, { role: "user", content: text }];
    const resp = await callModel(provider, apiKey, model, baseUrl, companyName, messages);
    return NextResponse.json(
      await processResponse(provider, apiKey, model, baseUrl, companyName, supabase, profile.company_id, user.id, messages, resp)
    );
  } catch (e: any) {
    return NextResponse.json({
      speak: `Sarthiwala AI error: ${e.message || "something went wrong."}`,
      awaitingConfirmation: false,
      history,
      pending: null,
    });
  }
}

async function callModel(
  provider: string,
  apiKey: string,
  model: string,
  baseUrl: string,
  companyName: string,
  messages: any[]
) {
  if (provider === "anthropic") {
    const client = new Anthropic({ apiKey });
    return client.messages.create({
      model,
      max_tokens: 1024,
      system: systemPrompt(companyName),
      tools: TOOLS as any,
      messages,
    });
  }

  // Custom OpenAI-compatible endpoint
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt(companyName) }, ...messages],
      tools: toOpenAITools(),
      max_tokens: 1024,
    }),
  });
  if (!res.ok) throw new Error(`Provider returned ${res.status}: ${await res.text()}`);
  return res.json();
}

async function processResponse(
  provider: string,
  apiKey: string,
  model: string,
  baseUrl: string,
  companyName: string,
  supabase: any,
  companyId: string,
  userId: string,
  messages: any[],
  resp: any
): Promise<any> {
  if (provider === "anthropic") {
    const toolBlock = resp.content.find((b: any) => b.type === "tool_use");
    if (!toolBlock) {
      const text = resp.content
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join("")
        .trim();
      const newHistory = [...messages, { role: "assistant", content: resp.content }].slice(-12);
      return { speak: text || "Done.", awaitingConfirmation: false, history: newHistory, pending: null };
    }

    const { name, input, id } = toolBlock;
    const assistantMsg = { role: "assistant", content: resp.content };

    if (WRITE_TOOLS.has(name)) {
      const pending: Pending = { messages: [...messages, assistantMsg], toolUseId: id, name, input };
      return {
        speak: `${describeAction(name, input)} Shall I go ahead?`,
        awaitingConfirmation: true,
        history: messages,
        pending,
      };
    }

    const result = await executeTool(supabase, companyId, userId, name, input);
    const messages2 = [
      ...messages,
      assistantMsg,
      { role: "user", content: [{ type: "tool_result", tool_use_id: id, content: JSON.stringify(result) }] },
    ];
    const resp2 = await callModel(provider, apiKey, model, baseUrl, companyName, messages2);
    return processResponse(provider, apiKey, model, baseUrl, companyName, supabase, companyId, userId, messages2, resp2);
  }

  // OpenAI-compatible wire format
  const choice = resp.choices[0].message;
  const toolCall = (choice.tool_calls || [])[0];

  if (!toolCall) {
    const text = (choice.content || "").trim();
    const newHistory = [...messages, { role: "assistant", content: choice.content || "" }].slice(-12);
    return { speak: text || "Done.", awaitingConfirmation: false, history: newHistory, pending: null };
  }

  const name = toolCall.function.name;
  let input: any = {};
  try {
    input = JSON.parse(toolCall.function.arguments || "{}");
  } catch {}

  const assistantMsg = {
    role: "assistant",
    content: choice.content,
    tool_calls: [
      { id: toolCall.id, type: "function", function: { name, arguments: toolCall.function.arguments } },
    ],
  };

  if (WRITE_TOOLS.has(name)) {
    const pending: Pending = { messages: [...messages, assistantMsg], toolUseId: toolCall.id, name, input };
    return {
      speak: `${describeAction(name, input)} Shall I go ahead?`,
      awaitingConfirmation: true,
      history: messages,
      pending,
    };
  }

  const result = await executeTool(supabase, companyId, userId, name, input);
  const messages2 = [
    ...messages,
    assistantMsg,
    { role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) },
  ];
  const resp2 = await callModel(provider, apiKey, model, baseUrl, companyName, messages2);
  return processResponse(provider, apiKey, model, baseUrl, companyName, supabase, companyId, userId, messages2, resp2);
}

async function handleConfirmation(
  provider: string,
  apiKey: string,
  model: string,
  baseUrl: string,
  companyName: string,
  supabase: any,
  companyId: string,
  userId: string,
  pending: Pending,
  userText: string
): Promise<any> {
  const cleaned = userText.trim().toLowerCase();
  let result: any;

  if (YES.some((w) => cleaned.includes(w))) {
    result = await executeTool(supabase, companyId, userId, pending.name, pending.input);
  } else if (NO.some((w) => cleaned.includes(w))) {
    result = { cancelled: true, note: "User declined the action." };
  } else {
    return {
      speak: "Sorry, should I go ahead? Please say yes or no.",
      awaitingConfirmation: true,
      history: pending.messages.slice(0, -1),
      pending,
    };
  }

  let messages: any[];
  if (provider === "anthropic") {
    messages = [
      ...pending.messages,
      {
        role: "user",
        content: [{ type: "tool_result", tool_use_id: pending.toolUseId, content: JSON.stringify(result) }],
      },
    ];
  } else {
    messages = [
      ...pending.messages,
      { role: "tool", tool_call_id: pending.toolUseId, content: JSON.stringify(result) },
    ];
  }

  const resp = await callModel(provider, apiKey, model, baseUrl, companyName, messages);
  return processResponse(provider, apiKey, model, baseUrl, companyName, supabase, companyId, userId, messages, resp);
}
