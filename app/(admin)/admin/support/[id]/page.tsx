import { getAdminTicketDetailsAction } from "@/app/actions/supportActions";
import AdminTicketDetailView from "@/components/admin/AdminTicketDetailView";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

// Correct Next.js 15 params type definition
type Params = Promise<{ id: string }>;

export default async function AdminTicketDetailPage({ params }: { params: Params }) {
    const resolvedParams = await params;

    // Ensure id is a number
    const ticketId = parseInt(resolvedParams.id);
    if (isNaN(ticketId)) notFound();

    const data = await getAdminTicketDetailsAction(ticketId);
    if (!data) notFound();

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col p-6 bg-[#0B1120] text-gray-200">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6 shrink-0">
                <Link href="/admin/support" className="p-2 bg-[#1F2937] hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition">
                    <ChevronLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-3">
                        {data.ticket.subject}
                        <span className="text-sm font-normal text-gray-500 px-2 py-0.5 bg-gray-800 rounded border border-gray-700">
                            #{data.ticket.id}
                        </span>
                    </h1>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                        <span className="text-blue-400 font-bold">{data.company_name}</span>
                        <span>•</span>
                        <span>{data.ticket.tenant_id}</span>
                    </div>
                </div>
            </div>

            {/* Client Component for Interaction */}
            <div className="flex-1 min-h-0">
                <AdminTicketDetailView
                    ticket={data.ticket}
                    initialMessages={data.messages}
                    companyName={data.company_name}
                />
            </div>
        </div>
    );
}
