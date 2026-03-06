"use client";

import { useState, useEffect } from "react";
import { Users, FileText, HandHelping, Link2, Activity, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Button from "@/components/ui/button";
import Pagination from "@/components/shared/pagination";
import api, { endpoints } from "@/lib/api";
import { AdminStats } from "@/types";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "requests" | "offers">("users");
  const [data, setData] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchTabData();
  }, [activeTab, page]);

  const fetchStats = async () => {
    try {
      const response = await api.get(endpoints.adminStats);
      setStats(response.data);
    } catch (error: any) {
      toast.error("Failed to load stats");
    }
  };

  const fetchTabData = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 20 };
      if (search) params.search = search;

      let url = "";
      if (activeTab === "users") url = endpoints.adminUsers;
      else if (activeTab === "requests") url = endpoints.adminRequests;
      else url = endpoints.adminOffers;

      const response = await api.get(url, { params });
      const items = response.data[activeTab] || response.data.data || [];
      setData(items);
      setTotalPages(response.data.pagination?.totalPages || 1);
    } catch (error: any) {
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this?")) return;
    try {
      if (activeTab === "requests") {
        await api.delete(endpoints.adminRequestById(id));
      } else if (activeTab === "offers") {
        await api.delete(endpoints.adminOfferById(id));
      }
      toast.success("Deleted successfully");
      fetchTabData();
      fetchStats();
    } catch (error: any) {
      toast.error("Failed to delete");
    }
  };

  const statCards = [
    { label: "Users", value: stats?.userCount || 0, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Requests", value: stats?.requestCount || 0, icon: FileText, color: "text-green-600 bg-green-50" },
    { label: "Offers", value: stats?.offerCount || 0, icon: HandHelping, color: "text-purple-600 bg-purple-50" },
    { label: "Matches", value: stats?.matchCount || 0, icon: Link2, color: "text-orange-600 bg-orange-50" },
    { label: "Active (30d)", value: stats?.activeUsers || 0, icon: Activity, color: "text-gray-600 bg-gray-100" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {statCards.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex gap-6">
            {(["users", "requests", "offers"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setPage(1); }}
                className={`pb-3 border-b-2 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchTabData()}
            className="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        {/* Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {activeTab === "users" && (
                    <>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
                    </>
                  )}
                  {activeTab === "requests" && (
                    <>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                    </>
                  )}
                  {activeTab === "offers" && (
                    <>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Skills</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Active</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No data found</td></tr>
                ) : (
                  data.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      {activeTab === "users" && (
                        <>
                          <td className="px-4 py-3 font-medium text-gray-900">{item.displayName}</td>
                          <td className="px-4 py-3 text-gray-600">{item.email}</td>
                          <td className="px-4 py-3 capitalize text-gray-600">{item.role || "—"}</td>
                          <td className="px-4 py-3 text-gray-500">{formatDate(item.createdAt)}</td>
                        </>
                      )}
                      {activeTab === "requests" && (
                        <>
                          <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{item.title}</td>
                          <td className="px-4 py-3 capitalize text-gray-600">{item.category}</td>
                          <td className="px-4 py-3 text-gray-600">{item.userName}</td>
                          <td className="px-4 py-3 capitalize text-gray-600">{item.status}</td>
                          <td className="px-4 py-3 text-gray-500">{formatDate(item.createdAt)}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </>
                      )}
                      {activeTab === "offers" && (
                        <>
                          <td className="px-4 py-3 font-medium text-gray-900">{item.userName}</td>
                          <td className="px-4 py-3 text-gray-600">{item.skills?.join(", ") || "—"}</td>
                          <td className="px-4 py-3">{item.isActive ? "Yes" : "No"}</td>
                          <td className="px-4 py-3 text-gray-500">{formatDate(item.createdAt)}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
