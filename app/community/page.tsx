import Link from "next/link";
import { q } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canAccessRoom } from "@/lib/access";

export const metadata = { title: "Community" };

export default async function Community({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  const sp = await searchParams;
  const rooms = await q(`SELECT * FROM rooms ORDER BY id`);
  const accessMap: Record<string, string> = {};
  for (const room of rooms) {
    const ok = await canAccessRoom(user, room.access as string);
    accessMap[String(room.id)] = ok ? "open" : "locked";
  }
  const counts = await q(`SELECT room_id, COUNT(*) AS c FROM posts GROUP BY room_id`);
  const postCount = new Map(counts.map((c) => [Number(c.room_id), Number(c.c)]));

  return (
    <div className="container">
      <h1 className="page-title">
        BTA <span>Community</span>
      </h1>
      <p className="page-sub">
        Discuss strategies, share charts, ask questions and connect with other BTA traders. Be
        constructive and respectful — moderators keep the rooms clean.
      </p>
      {sp.error && <div className="msg-banner msg-err">{sp.error}</div>}
      <div className="grid grid-3">
        {rooms.map((room) => {
          const locked = accessMap[String(room.id)] === "locked";
          const badges: Record<string, string> = {
            public: "Free",
            member: "Members",
            student: "Students",
            vip: "VIP only",
          };
          return (
            <div className="card" key={String(room.id)}>
              <span className={`chip ${room.access === "vip" ? "gold" : room.access === "student" ? "purple" : "green"}`}>
                {badges[String(room.access)]}
              </span>
              <h3 style={{ margin: "0.6rem 0 0.4rem" }}>{String(room.name)}</h3>
              <p>{String(room.description)}</p>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.6rem" }}>
                {postCount.get(Number(room.id)) ?? 0} discussions
              </p>
              <div className="price-row">
                {locked ? (
                  <Link className="btn outline sm" href={room.access === "vip" ? "/vip" : "/login"}>
                    {room.access === "vip" ? "Join VIP Elite" : "Login to enter"}
                  </Link>
                ) : (
                  <Link className="btn green sm" href={`/community/${String(room.slug)}`}>
                    Enter room
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
