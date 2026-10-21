import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const modules = [
  { name: "Authentication & Access", detail: "Email + password, admin/member roles, sessions" },
  { name: "Users & Members", detail: "Profiles, directory, per-member history" },
  { name: "Communication", detail: "Targeted inbox with replies" },
  { name: "Connect Groups", detail: "Group membership, messaging and events" },
  { name: "Events", detail: "General and group-specific, with reminders" },
  { name: "Prayer Requests", detail: "Posted inside groups, pinnable" },
  { name: "Attendance", detail: "Per service or event, per member over time" },
  { name: "Tithes & Giving", detail: "Recorded per member, with church-wide and personal views" },
  { name: "Partnerships & Promises", detail: "Pledges and follow-through tracking" },
  { name: "Sermons", detail: "Admin-uploaded audio and video" },
  { name: "Personal Notes", detail: "Private notes per sermon" },
  { name: "Notifications", detail: "Messages, events, group activity" },
];

// Placeholder rows, here only to show how figures set in the theme.
const sampleGiving = [
  { date: "2026-08-02", member: "Ada Nwosu", type: "Tithe", amount: "1,250.00" },
  { date: "2026-08-02", member: "Samuel Okafor", type: "Offering", amount: "80.00" },
  { date: "2026-07-26", member: "Grace Mensah", type: "Tithe", amount: "3,400.00" },
];

// Unlinked on purpose: this is the theme specimen, kept so every token can be
// checked in one place. Nothing in the navigation points here.
export const metadata = {
  title: "Theme specimen",
  robots: { index: false, follow: false },
};

export default function Specimen() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-12 px-6 py-16">
      <header className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <Badge variant="secondary">Specimen</Badge>
          <ThemeToggle />
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-balance">Theme specimen</h1>
        <p className="text-muted-foreground max-w-2xl text-pretty">
          Every design token in one place — colour, type and the component set — so a palette change
          can be checked at a glance. Not linked from the site.
        </p>
        <div className="flex gap-3">
          <Button disabled>Sign in</Button>
          <Button variant="outline" disabled>
            Admin dashboard
          </Button>
        </div>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium tracking-wide uppercase">Theme check</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Members</CardDescription>
              <CardTitle className="text-2xl">
                <span className="numeric">412</span>
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Attendance, last service</CardDescription>
              <CardTitle className="text-2xl">
                <span className="numeric">312</span>
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Tithes this month</CardDescription>
              <CardTitle className="text-2xl">
                <span className="numeric">12,480.00</span>
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardContent className="flex flex-col gap-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleGiving.map((row) => (
                  <TableRow key={`${row.date}-${row.member}`}>
                    <TableCell className="numeric text-muted-foreground">{row.date}</TableCell>
                    <TableCell>{row.member}</TableCell>
                    <TableCell>
                      <Badge variant={row.type === "Tithe" ? "default" : "secondary"}>
                        {row.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="numeric text-right">{row.amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="specimen-email">Email</Label>
                <Input id="specimen-email" placeholder="member@church.org" className="w-64" />
              </div>
              <Button>Save changes</Button>
              <Button variant="secondary">Cancel</Button>
              <Button variant="destructive">Remove</Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium tracking-wide uppercase">Modules</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {modules.map((module, index) => (
            <Card key={module.name}>
              <CardHeader>
                <CardTitle className="flex items-baseline gap-2 text-base">
                  <span className="numeric text-muted-foreground text-xs font-normal">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{module.name}</span>
                </CardTitle>
                <CardDescription>{module.detail}</CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">Not implemented</CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
