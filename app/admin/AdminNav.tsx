import { requireStaff } from "@/lib/auth";
import Link from "next/link";

export default async function AdminNav() {
  await requireStaff();
  const links = [
    ["/admin", "Overview"],
    ["/admin/products", "Products"],
    ["/admin/orders", "Orders & Payments"],
    ["/admin/courses", "Courses"],
    ["/admin/signals", "Signals"],
    ["/admin/members", "Members"],
    ["/admin/community", "Community"],
    ["/admin/resources", "Resources"],
    ["/admin/messages", "Messages"],
    ["/admin/brokers", "Broker APIs"],
    ["/admin/settings", "Settings"],
  ];
  return (
    <div className="contact-list no-print" style={{ marginBottom: "1.5rem" }}>
      {links.map(([href, label]) => (
        <Link key={href} className="btn outline sm" href={href}>
          {label}
        </Link>
      ))}
    </div>
  );
}
