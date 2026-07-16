import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, RiskBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Filter } from "lucide-react";
import { households } from "@/lib/demo-data";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/households")({
  component: Households,
});

function Households() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = households.filter((h) =>
    (h.head + h.community).toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AppLayout>
      <PageHeader
        title="Households"
        description={`${households.length} households registered across your zone`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl"><Plus className="mr-1 h-4 w-4" /> Register</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Register household</DialogTitle>
                <DialogDescription>Add a new household to your community register.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-1.5"><Label>Head of household</Label><Input placeholder="e.g. Kofi Owusu Ansah" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5"><Label>Community</Label>
                    <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kwadaso">Kwadaso</SelectItem>
                        <SelectItem value="bomso">Bomso</SelectItem>
                        <SelectItem value="atonsu">Atonsu</SelectItem>
                        <SelectItem value="suame">Suame</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5"><Label>Members</Label><Input type="number" defaultValue={4} /></div>
                </div>
                <div className="grid gap-1.5"><Label>Address</Label><Input placeholder="House number & street" /></div>
                <div className="grid gap-1.5"><Label>Phone</Label><Input placeholder="+233…" /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => { toast.success("Household registered"); setOpen(false); }}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search households…" className="pl-9" />
        </div>
        <Button variant="outline" className="rounded-xl"><Filter className="mr-1 h-4 w-4" /> Filters</Button>
      </div>

      <Card className="rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Head</TableHead>
                  <TableHead>Community</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead className="hidden md:table-cell">Address</TableHead>
                  <TableHead className="hidden lg:table-cell">Phone</TableHead>
                  <TableHead>Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((h) => (
                  <TableRow key={h.id} className="cursor-pointer">
                    <TableCell className="font-medium">{h.head}</TableCell>
                    <TableCell>{h.community}</TableCell>
                    <TableCell>{h.members}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{h.address}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{h.phone}</TableCell>
                    <TableCell><RiskBadge level={h.risk} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
