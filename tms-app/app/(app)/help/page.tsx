export default function HelpPage() {
  const items = [
    { q: "How do I create a bill?", a: "Go to New Bill, fill in the required fields (marked *), and click Save Bill. The bill number is generated automatically." },
    { q: "How is the Total Freight calculated?", a: "It's the sum of Transport/Service Charge, Service Charges, Parking Charges, Hold Charges, and PAN Amount — computed automatically as you type." },
    { q: "How do I mark a bill as paid?", a: "Open the bill from All Bills, click Edit, and change Payment Status to Paid, then Save." },
    { q: "Who can manage users and company settings?", a: "Only accounts with the Admin role can access User Mgmt and Company pages." },
    { q: "How do reminders work?", a: "The Reminders page automatically lists unpaid bills that are more than 7 days old." },
    { q: "Is my company's data private?", a: "Yes — every account belongs to one company, and the database enforces that you can only ever see your own company's bills, customers and users." },
  ];

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-text">Help</h1>
      <p className="text-text-muted mb-6">Frequently asked questions</p>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.q} className="card p-4">
            <p className="font-semibold text-text mb-1">{item.q}</p>
            <p className="text-text-muted text-sm">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
