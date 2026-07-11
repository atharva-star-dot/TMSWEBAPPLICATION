// Ported 1:1 from the desktop app's voice_agent.py TOOLS list, adapted to the
// web app's schema (bill_number is the primary handle instead of a SQLite
// autoincrement id, since bills are keyed by uuid here).

export const TOOLS = [
  {
    name: "search_bills",
    description:
      "Search/list bills. Use for questions like 'show pending bills', 'find bill for MH12AB1234', 'bills over 50000'.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Free text to match against bill number, driver, route, vehicle, or container number. Leave empty to not filter.",
        },
        status: {
          type: "string",
          enum: ["All Status", "Pending", "Delivered", "Cancelled"],
          description: "Filter by bill status.",
        },
        min_amount: { type: "number", description: "Only bills with freight amount >= this value." },
      },
    },
  },
  {
    name: "get_bill",
    description: "Get full details of one specific bill by its bill number.",
    input_schema: {
      type: "object",
      properties: { bill_number: { type: "string" } },
      required: ["bill_number"],
    },
  },
  {
    name: "update_bill_status",
    description: "WRITE ACTION. Change a bill's status (Pending / Delivered / Cancelled).",
    input_schema: {
      type: "object",
      properties: {
        bill_number: { type: "string" },
        status: { type: "string", enum: ["Pending", "Delivered", "Cancelled"] },
      },
      required: ["bill_number", "status"],
    },
  },
  {
    name: "update_payment_status",
    description: "WRITE ACTION. Mark a bill's payment status (Paid / Unpaid / Partial).",
    input_schema: {
      type: "object",
      properties: {
        bill_number: { type: "string" },
        payment_status: { type: "string", enum: ["Paid", "Unpaid", "Partial"] },
      },
      required: ["bill_number", "payment_status"],
    },
  },
  {
    name: "delete_bill",
    description: "WRITE ACTION (destructive). Permanently delete a bill.",
    input_schema: {
      type: "object",
      properties: { bill_number: { type: "string" } },
      required: ["bill_number"],
    },
  },
  {
    name: "create_simple_bill",
    description:
      "WRITE ACTION. Create a new bill quickly with the essentials given by voice. Bill number and date are auto-generated.",
    input_schema: {
      type: "object",
      properties: {
        driver_name: { type: "string" },
        vehicle_number: { type: "string" },
        route: { type: "string" },
        from_location: { type: "string" },
        to_location: { type: "string" },
        container_number: { type: "string" },
        freight_amount: { type: "number" },
      },
      required: ["driver_name", "vehicle_number", "route", "freight_amount"],
    },
  },
  {
    name: "list_customers",
    description: "List or search customers by name.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Name fragment to search. Leave empty to list all." },
      },
    },
  },
  {
    name: "add_customer",
    description: "WRITE ACTION. Add a new customer.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        gst_no: { type: "string" },
        address: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
      },
      required: ["name"],
    },
  },
  {
    name: "get_dashboard_summary",
    description:
      "Get an overall business summary: total bills, pending count, overdue unpaid bills, recent revenue.",
    input_schema: { type: "object", properties: {} },
  },
] as const;

export const WRITE_TOOLS = new Set([
  "update_bill_status",
  "update_payment_status",
  "delete_bill",
  "create_simple_bill",
  "add_customer",
]);

export function toOpenAITools() {
  return TOOLS.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }));
}

export function describeAction(name: string, input: any): string {
  switch (name) {
    case "update_bill_status":
      return `You want to mark bill ${input.bill_number} as ${input.status}.`;
    case "update_payment_status":
      return `You want to mark bill ${input.bill_number} payment as ${input.payment_status}.`;
    case "delete_bill":
      return `You want to permanently delete bill ${input.bill_number}. This cannot be undone.`;
    case "create_simple_bill":
      return `You want to create a new bill for driver ${input.driver_name}, vehicle ${input.vehicle_number}, route ${input.route}, amount ${input.freight_amount} rupees.`;
    case "add_customer":
      return `You want to add a new customer named ${input.name}.`;
    default:
      return `You want to run ${name}.`;
  }
}

export function systemPrompt(companyName: string) {
  return `You are Sarthiwala AI, the voice and chat assistant built into a Transport Management System used by ${companyName}, an Indian container/road logistics company. You help the operator manage bills (invoices), customers, and payments — by voice or by typing.

Rules:
- Be brief. Your replies may be read aloud by text-to-speech, so avoid long lists, avoid markdown, avoid symbols like • or #. Speak like a helpful human assistant on a phone call.
- When reporting money, say amounts naturally, e.g. "forty two thousand rupees".
- When a tool returns multiple bills, summarise the top few, don't read out every field of every bill.
- Never invent bill numbers, customer names, or amounts — only use what the tools return.
- If a request is ambiguous (e.g. which bill, which customer), ask a short clarifying question instead of guessing.
- You may call at most one tool per turn.
- When you successfully create a bill, mention that it has been saved.`;
}
