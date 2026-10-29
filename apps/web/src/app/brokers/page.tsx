import { redirect } from "next/navigation";

// Existing links enter the conversation instead of a separate setup screen.
export default function BrokersPage() { redirect("/?broker=tiger"); }
