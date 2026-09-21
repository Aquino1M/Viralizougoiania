import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/session";
import LoginForm from "@/components/LoginForm";
export default async function Login(){if(await isAdmin())redirect("/admin");return <LoginForm/>}
