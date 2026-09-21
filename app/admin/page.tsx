import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/session";
import AdminApp from "@/components/AdminApp";
export const dynamic="force-dynamic";
export default async function Admin(){if(!await isAdmin())redirect("/admin/login");return <AdminApp/>}
