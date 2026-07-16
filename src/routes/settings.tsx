import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { currentUser } from "@/lib/demo-data";

export const Route = createFileRoute("/settings")({
  component: Settings,
});

function Settings() {
  return (
    <AppLayout>
      <PageHeader title="Settings" description="Manage your profile, notifications and preferences" />

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="rounded-xl">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="rounded-xl">
            <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                    {currentUser.avatar}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{currentUser.name}</div>
                  <div className="text-xs text-muted-foreground">{currentUser.role}</div>
                </div>
                <Button variant="outline" size="sm" className="ml-auto">Change photo</Button>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="grid gap-1.5"><Label>Full name</Label><Input defaultValue={currentUser.name} /></div>
                <div className="grid gap-1.5"><Label>Email</Label><Input defaultValue={currentUser.email} /></div>
                <div className="grid gap-1.5"><Label>Phone</Label><Input defaultValue={currentUser.phone} /></div>
                <div className="grid gap-1.5"><Label>Facility</Label><Input defaultValue={currentUser.facility} /></div>
                <div className="grid gap-1.5"><Label>Language</Label>
                  <Select defaultValue="en"><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="tw">Twi</SelectItem>
                      <SelectItem value="ga">Ga</SelectItem>
                      <SelectItem value="ee">Ewe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5"><Label>Region</Label><Input defaultValue={currentUser.region} /></div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => toast.success("Profile updated")}>Save changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="rounded-xl">
            <CardHeader><CardTitle className="text-base">Notifications</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                ["High-risk case alerts", "Push me the moment an AI assessment flags a high-risk patient."],
                ["Referral updates", "Notify when a referral is received or completed at the facility."],
                ["Visit reminders", "Daily reminder for scheduled home visits."],
                ["Immunization due", "Alert when a child in your zone is due for a vaccine."],
              ].map(([t, d]) => (
                <div key={t} className="flex items-start justify-between gap-4 border-b last:border-0 pb-4 last:pb-0">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{t}</div>
                    <div className="text-xs text-muted-foreground">{d}</div>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="rounded-xl">
            <CardHeader><CardTitle className="text-base">Security</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="grid gap-1.5"><Label>Current password</Label><Input type="password" placeholder="••••••••" /></div>
                <div />
                <div className="grid gap-1.5"><Label>New password</Label><Input type="password" /></div>
                <div className="grid gap-1.5"><Label>Confirm new password</Label><Input type="password" /></div>
              </div>
              <div className="flex items-start justify-between gap-4 border-t pt-4">
                <div>
                  <div className="text-sm font-medium">Two-factor authentication</div>
                  <div className="text-xs text-muted-foreground">Extra layer of security via SMS OTP.</div>
                </div>
                <Switch />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => toast.success("Password updated")}>Update password</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="about">
          <Card className="rounded-xl">
            <CardHeader><CardTitle className="text-base">About NurtureAI</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p><strong className="text-foreground">NurtureAI v0.1.0 (MVP)</strong> — built for CHPS workers across Ghana.</p>
              <p>NurtureAI helps community-based health workers register households, monitor maternal and child health, and get AI-assisted assessments with referral recommendations.</p>
              <div className="grid sm:grid-cols-3 gap-3 pt-3 border-t">
                <a className="text-primary text-sm font-medium hover:underline" href="#">Help & support</a>
                <a className="text-primary text-sm font-medium hover:underline" href="#">Privacy policy</a>
                <a className="text-primary text-sm font-medium hover:underline" href="#">Terms of service</a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
