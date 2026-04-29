import { AppLayout } from "@/components/AppLayout";
import { useAdminUsers, useSetUserRole } from "@/hooks/useAdminUsers";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import type { AppRole } from "@/hooks/useUserRole";

const roleLabel: Record<AppRole, string> = {
  admin: "Admin",
  sales_manager: "Sales Manager",
  agent: "Agent",
};

const roleVariant: Record<AppRole, "default" | "secondary" | "outline"> = {
  admin: "default",
  sales_manager: "secondary",
  agent: "outline",
};

const AdminUsers = () => {
  const { data: users, isLoading } = useAdminUsers();
  const setRole = useSetUserRole();

  const handleChange = (userId: string, role: AppRole) => {
    setRole.mutate(
      { userId, role },
      {
        onSuccess: () => toast.success("Role updated"),
        onError: (e: any) => toast.error(e.message),
      }
    );
  };

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Management</h1>
          <p className="page-subtitle">Manage user roles and permissions</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Current Role</TableHead>
                <TableHead className="w-48">Change Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((u) => {
                const primary = (u.roles[0] ?? "agent") as AppRole;
                return (
                  <TableRow key={u.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                          <AvatarFallback className="text-xs">
                            {u.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{u.full_name || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={roleVariant[primary]}>{roleLabel[primary]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={primary}
                        onValueChange={(v) => handleChange(u.user_id, v as AppRole)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="agent">Agent</SelectItem>
                          <SelectItem value="sales_manager">Sales Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminUsers;
