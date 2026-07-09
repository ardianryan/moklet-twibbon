"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, Trash2, Copy, FileSpreadsheet, LogOut, UserPlus, Sliders, Edit, X } from "lucide-react";
import { Footer } from "../_components/footer";

interface Campaign {
  id: number;
  slug: string;
  title: string;
  frameUrl: string;
  caption: string;
  createdAt: string;
}

interface UserInfo {
  id: number;
  username: string;
  role: string;
  createdAt: string;
}

interface AdminClientProps {
  initialCampaigns: Campaign[];
  username: string;
}

export default function AdminClient({ initialCampaigns, username }: AdminClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"campaigns" | "users">("campaigns");

  // Campaign State
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Edit Campaign Modal State
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);

  // User Registration & CRUD State
  const [usersList, setUsersList] = useState<UserInfo[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editingUserRole, setEditingUserRole] = useState("user");

  const [isLoading, setIsLoading] = useState(false);

  // Fetch campaigns
  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      } else if (res.status === 401) {
        toast.error("Session expired, please sign in again.");
        router.push("/login");
      } else {
        toast.error("Failed to load campaigns");
      }
    } catch (err) {
      toast.error("Connection error occurred");
    }
  };

  // Fetch users (admin only)
  const fetchUsers = useCallback(async () => {
    if (username !== "admin") return;
    try {
      const res = await fetch("/api/auth/users");
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      } else {
        toast.error("Failed to load user list");
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  }, [username]);

  // Load users when mounting or switching to users tab
  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    }
  }, [activeTab, fetchUsers]);

  // Create Campaign Submit
  const handleCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !slug.trim() || !file) {
      toast.error("All fields are required");
      return;
    }

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-_]/g, "");
    if (cleanSlug.length < 3) {
      toast.error("Slug must be at least 3 characters long");
      return;
    }
    if (cleanSlug.length > 50) {
      toast.error("Slug must be 50 characters or less");
      return;
    }

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("slug", cleanSlug);
    formData.append("caption", caption.trim());
    formData.append("file", file);

    setIsLoading(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Campaign published successfully!");
        setTitle("");
        setSlug("");
        setCaption("");
        setFile(null);
        
        const fileInput = document.getElementById("file-input") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        
        fetchCampaigns();
      } else {
        toast.error(data.error || "Failed to publish campaign");
      }
    } catch (err) {
      toast.error("Failed to send campaign data");
    } finally {
      setIsLoading(false);
    }
  };

  // Edit Campaign Trigger
  const startEditing = (camp: Campaign) => {
    setEditingCampaign(camp);
    setEditTitle(camp.title);
    setEditSlug(camp.slug);
    setEditCaption(camp.caption || "");
    setEditFile(null);
  };

  // Edit Campaign Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;

    if (!editTitle.trim() || !editSlug.trim()) {
      toast.error("Title and slug are required");
      return;
    }

    const cleanSlug = editSlug.toLowerCase().trim().replace(/[^a-z0-9-_]/g, "");
    if (cleanSlug.length < 3) {
      toast.error("Slug must be at least 3 characters long");
      return;
    }
    if (cleanSlug.length > 50) {
      toast.error("Slug must be 50 characters or less");
      return;
    }

    const formData = new FormData();
    formData.append("id", editingCampaign.id.toString());
    formData.append("title", editTitle.trim());
    formData.append("slug", cleanSlug);
    formData.append("caption", editCaption.trim());
    if (editFile) {
      formData.append("file", editFile);
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "PUT",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Campaign updated successfully!");
        setEditingCampaign(null);
        fetchCampaigns();
      } else {
        toast.error(data.error || "Failed to update campaign");
      }
    } catch (err) {
      toast.error("An error occurred during update");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Campaign
  const handleDeleteCampaign = async (campaignSlug: string) => {
    if (!confirm("Are you sure you want to delete this campaign? The frame file will be removed from the server.")) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/campaigns?slug=${campaignSlug}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Campaign deleted successfully!");
        fetchCampaigns();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete campaign");
      }
    } catch (err) {
      toast.error("Failed to delete campaign");
    } finally {
      setIsLoading(false);
    }
  };

  // User Registration Submit
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUsername.trim() || !newPassword) {
      toast.error("All fields are required");
      return;
    }

    const cleanUser = newUsername.toLowerCase().trim();

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanUser,
          password: newPassword,
          role: newUserRole,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`User '${cleanUser}' created successfully!`);
        setNewUsername("");
        setNewPassword("");
        setNewUserRole("user");
        fetchUsers();
      } else {
        toast.error(data.error || "Failed to register user");
      }
    } catch (err) {
      toast.error("Failed to register user");
    } finally {
      setIsLoading(false);
    }
  };

  // Edit User Submit
  const handleUserEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editUsername.trim()) {
      toast.error("Username is required");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingUser.id,
          username: editUsername.trim(),
          password: editPassword || undefined,
          role: editingUserRole,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("User updated successfully!");
        setEditingUser(null);
        fetchUsers();
      } else {
        toast.error(data.error || "Failed to update user");
      }
    } catch (err) {
      toast.error("An error occurred during update");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (userId: number, userToDelete: string) => {
    if (userToDelete === username) {
      toast.error("You cannot delete your own account.");
      return;
    }
    if (!confirm(`Are you sure you want to delete user '${userToDelete}'?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/auth/users?id=${userId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("User deleted successfully!");
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete user");
      }
    } catch (err) {
      toast.error("Failed to delete user");
    } finally {
      setIsLoading(false);
    }
  };

  // Logout Trigger
  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Logged out successfully!");
        router.push("/login");
        router.refresh();
      } else {
        toast.error("Failed to log out");
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  // Copy URL Helper
  const handleCopyLink = (campaignSlug: string) => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      const shortUrl = `${origin}/${campaignSlug}`;
      navigator.clipboard.writeText(shortUrl);
      toast.success(`Copied: ${shortUrl}`);
    }
  };

  return (
    <>
      <main className="min-h-screen bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="md:flex md:items-center md:justify-between border-b border-neutral-200 pb-5">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold leading-7 text-neutral-900 sm:text-4xl sm:truncate">
              Smansage Twibbon Admin Dashboard
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Welcome, <span className="font-semibold text-primary-600">{username}</span>. Manage campaign twibbons and users here.
            </p>
          </div>
          
          <div className="mt-4 flex gap-3 md:mt-0 md:ml-4">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-neutral-300 rounded-md shadow-sm text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              View Website
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="border-b border-neutral-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("campaigns")}
              className={`pb-4 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 ${
                activeTab === "campaigns"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
              }`}
            >
              <Sliders className="w-4 h-4" />
              Manage Campaigns
            </button>
            {username === "admin" && (
              <button
                onClick={() => setActiveTab("users")}
                className={`pb-4 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 ${
                  activeTab === "users"
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
                }`}
              >
                <UserPlus className="w-4 h-4" />
                Manage Users
              </button>
            )}
          </nav>
        </div>

        {/* Tab Contents */}
        {activeTab === "campaigns" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Create Campaign Form */}
            <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-neutral-200 shadow-sm h-fit">
              <h2 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary-500" />
                Create New Campaign
              </h2>
              
              <form onSubmit={handleCampaignSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                    Campaign Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dies Natalis 43"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-neutral-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                    URL Slug (Short Link)
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-neutral-300 bg-neutral-100 text-neutral-500 text-xs">
                      /
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="dies-natalis"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="flex-1 min-w-0 w-full px-3 py-2 border border-neutral-300 rounded-r-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-neutral-800"
                    />
                  </div>
                  <p className="mt-1 text-xs text-neutral-400">
                    Use lowercase letters, numbers, and dashes (-) only
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                    Prefilled Share Caption
                  </label>
                  <textarea
                    placeholder="Enter the caption template that users will copy when sharing..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-neutral-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                    Twibbon Frame (Transparent PNG)
                  </label>
                  <input
                    id="file-input"
                    type="file"
                    required
                    accept="image/png"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 file:cursor-pointer hover:file:bg-primary-100 border border-neutral-300 rounded-md p-1"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? "Processing..." : "Publish Campaign"}
                </button>
              </form>
            </div>

            {/* Campaign Table Listing */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-primary-500" />
                Active Campaigns ({campaigns.length})
              </h2>

              {isLoading && campaigns.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-sm">
                  Loading campaigns...
                </div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-neutral-200 rounded-lg text-neutral-500 text-sm">
                  No campaigns created yet. Start by publishing one using the form.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-neutral-200 text-sm">
                    <thead>
                      <tr className="bg-neutral-50 text-neutral-600 text-xs font-semibold uppercase tracking-wider">
                        <th className="px-4 py-3 text-left">Preview</th>
                        <th className="px-4 py-3 text-left">Campaign / Title</th>
                        <th className="px-4 py-3 text-left">Short Link</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {campaigns.map((camp) => (
                        <tr key={camp.id} className="hover:bg-neutral-50/50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap align-middle">
                            <div className="relative w-16 h-16 border border-neutral-200 rounded-lg overflow-hidden bg-neutral-100 flex items-center justify-center">
                              <Image
                                src={camp.frameUrl}
                                alt={camp.title}
                                fill
                                className="object-contain"
                                unoptimized
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <div className="font-bold text-neutral-800">{camp.title}</div>
                            <div className="text-xs text-neutral-400 mt-0.5">
                              Created: {new Date(camp.createdAt).toLocaleDateString("en-US")}
                            </div>
                            {camp.caption && (
                              <div className="text-xs text-neutral-500 truncate max-w-[200px] mt-1 italic">
                                &quot;{camp.caption}&quot;
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap align-middle">
                            <div className="flex items-center gap-1">
                              <Link
                                href={`/${camp.slug}`}
                                target="_blank"
                                className="text-primary-500 font-medium hover:underline text-xs"
                              >
                                /{camp.slug}
                              </Link>
                              <button
                                onClick={() => handleCopyLink(camp.slug)}
                                title="Copy Link"
                                className="p-1 text-neutral-400 hover:text-primary-500 hover:bg-neutral-100 rounded transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right align-middle">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => startEditing(camp)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-neutral-200 rounded text-xs font-semibold text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteCampaign(camp.slug)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-red-200 rounded text-xs font-semibold text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {activeTab === "users" && username === "admin" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Register New User form */}
            <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-neutral-200 shadow-sm h-fit">
              <h2 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary-500" />
                Register New User
              </h2>
              
              <form onSubmit={handleUserSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="operator"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-neutral-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min. 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-neutral-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                    User Role
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-neutral-800"
                  >
                    <option value="user">User (Operator)</option>
                    <option value="admin">Admin (Full Access)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? "Processing..." : "Register User"}
                </button>
              </form>
            </div>

            {/* Registered Users Table */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-primary-500" />
                Registered Users ({usersList.length})
              </h2>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 text-sm">
                  <thead>
                    <tr className="bg-neutral-50 text-neutral-600 text-xs font-semibold uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">ID</th>
                      <th className="px-4 py-3 text-left">Username</th>
                      <th className="px-4 py-3 text-left">Role</th>
                      <th className="px-4 py-3 text-left">Created Date</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {usersList.map((user) => (
                      <tr key={user.id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="px-4 py-3 align-middle text-neutral-500">#{user.id}</td>
                        <td className="px-4 py-3 align-middle font-bold text-neutral-800">{user.username}</td>
                        <td className="px-4 py-3 align-middle">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            user.role === "admin"
                              ? "bg-purple-100 text-purple-700 border border-purple-200"
                              : "bg-blue-100 text-blue-700 border border-blue-200"
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle text-neutral-500">
                          {new Date(user.createdAt).toLocaleDateString("en-US")}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right align-middle">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingUser(user);
                                setEditUsername(user.username);
                                setEditPassword("");
                                setEditingUserRole(user.role || "user");
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-neutral-200 rounded text-xs font-semibold text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            {user.username !== username && (
                              <button
                                onClick={() => handleDeleteUser(user.id, user.username)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-red-200 rounded text-xs font-semibold text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Edit Campaign Modal */}
      {editingCampaign && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xl max-w-md w-full p-6 space-y-4 relative">
            
            <button
              onClick={() => setEditingCampaign(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 p-1 hover:bg-neutral-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-neutral-900">
              Edit Campaign Details
            </h2>
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                  Campaign Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="Campaign Title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-neutral-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                  URL Slug (Short Link)
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-neutral-300 bg-neutral-100 text-neutral-500 text-xs">
                    /
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="slug"
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                    className="flex-1 min-w-0 w-full px-3 py-2 border border-neutral-300 rounded-r-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-neutral-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                  Share Caption Template
                </label>
                <textarea
                  placeholder="Share caption template..."
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-neutral-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                  Replace Frame (PNG - Optional)
                </label>
                <input
                  type="file"
                  accept="image/png"
                  onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 file:cursor-pointer hover:file:bg-primary-100 border border-neutral-300 rounded-md p-1"
                />
                <p className="mt-1 text-xs text-neutral-400">
                  Leave empty to keep the existing frame file
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCampaign(null)}
                  className="px-4 py-2 border border-neutral-300 rounded-md text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xl max-w-md w-full p-6 space-y-4 relative">
            
            <button
              onClick={() => setEditingUser(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 p-1 hover:bg-neutral-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-neutral-900">
              Edit User Credentials
            </h2>
            
            <form onSubmit={handleUserEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="Username"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-neutral-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                  New Password (Optional)
                </label>
                <input
                  type="password"
                  placeholder="Leave blank to keep current password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-neutral-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                  User Role
                </label>
                <select
                  value={editingUserRole}
                  onChange={(e) => setEditingUserRole(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-neutral-800 disabled:opacity-60"
                  disabled={editingUser.username === username}
                >
                  <option value="user">User (Operator)</option>
                  <option value="admin">Admin (Full Access)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-neutral-300 rounded-md text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </main>
      <Footer />
    </>
  );
}
