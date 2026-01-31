import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const workTypes = [
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
  { value: "onsite", label: "Onsite" },
];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "onhold", label: "On Hold" },
  { value: "closed", label: "Closed" },
];

const visaTypeOptions = [
  { value: "", label: "Any" },
  { value: "citizen", label: "US Citizen" },
  { value: "green-card", label: "Green Card" },
  { value: "h1b", label: "H1B" },
  { value: "opt", label: "OPT" },
  { value: "cpt", label: "CPT" },
  { value: "needs-sponsorship", label: "Needs Sponsorship" },
  { value: "other", label: "Other" },
];

type Job = {
  id: string;
  jobCode: string;
  title: string;
  description?: string | null;
  descriptionPdfUrl?: string | null;
  clientName?: string | null;
  location?: string | null;
  workType: string;
  visaType?: string | null;
  positions: number;
  status: string;
  jobPositionId?: string | null;
  jobPositionName?: string | null;
  createdAt?: string;
};

type JobPosition = {
  id: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

const statusTone: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  onhold: "bg-amber-100 text-amber-800",
  closed: "bg-gray-200 text-gray-700",
};

export const Jobs: React.FC = () => {
  const { token, account } = useAuth();
  const isAdmin = account?.role === "admin";

  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobDetail, setShowJobDetail] = useState(false);
  const [editingPositions, setEditingPositions] = useState(false);
  const [editPositionsValue, setEditPositionsValue] = useState("");
  const [updatingPositions, setUpdatingPositions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const [positionForm, setPositionForm] = useState({
    name: "",
    description: "",
  });

  const [form, setForm] = useState({
    title: "",
    description: "",
    clientName: "",
    location: "",
    workType: "hybrid",
    visaType: "",
    positions: "1",
    status: "active",
    descriptionPdfUrl: "",
    jobPositionId: "",
  });

  const apiHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    }),
    [token],
  );

  const { totalPages, startIndex, endIndex, paginatedJobs } = useMemo(() => {
    const total = Math.ceil(jobs.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return {
      totalPages: total,
      startIndex: start,
      endIndex: end,
      paginatedJobs: jobs.slice(start, end),
    };
  }, [jobs, currentPage, itemsPerPage]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const fetchJobs = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/jobs`, {
        headers: apiHeaders,
      });
      if (!res.ok) {
        throw new Error(`Failed to load jobs (${res.status})`);
      }
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  const fetchJobPositions = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/jobPositions`, {
        headers: apiHeaders,
      });
      if (!res.ok) {
        throw new Error(`Failed to load job positions (${res.status})`);
      }
      const data = await res.json();
      setJobPositions(data.jobPositions || []);
    } catch (err) {
      console.error("Failed to load job positions:", err);
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchJobPositions();
  }, [token]);

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      clientName: "",
      location: "",
      workType: "hybrid",
      visaType: "",
      positions: "1",
      status: "active",
      descriptionPdfUrl: "",
      jobPositionId: "",
    });
    setPdfFile(null);
    setPdfFileName(null);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
    setError(null);
    setStatusMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !isAdmin) return;

    setSubmitting(true);
    setError(null);
    setStatusMsg(null);

    if (!form.title.trim()) {
      setError("Job title is required");
      setSubmitting(false);
      return;
    }

    const positionsNumber = parseInt(form.positions, 10);
    if (Number.isNaN(positionsNumber) || positionsNumber <= 0) {
      setError("Positions must be a positive number");
      setSubmitting(false);
      return;
    }

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      clientName: form.clientName.trim() || null,
      location: form.location.trim() || null,
      workType: form.workType,
      visaType: form.visaType.trim() || null,
      positions: positionsNumber,
      status: form.status,
      jobPositionId: form.jobPositionId || null,
    };

    // Upload description PDF if provided
    if (pdfFile) {
      try {
        const formData = new FormData();
        formData.append("resume", pdfFile);

        const uploadRes = await fetch(`${API_BASE}/api/upload`, {
          method: "POST",
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: formData,
        });

        if (!uploadRes.ok) {
          const errBody = await uploadRes.json().catch(() => ({}));
          throw new Error(errBody.error || "Failed to upload PDF");
        }

        const uploadData = await uploadRes.json();
        payload.descriptionPdfUrl = uploadData.url;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload PDF");
        setSubmitting(false);
        return;
      }
    } else if (form.descriptionPdfUrl.trim()) {
      payload.descriptionPdfUrl = form.descriptionPdfUrl.trim();
    }

    try {
      const res = await fetch(`${API_BASE}/api/jobs`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      const job: Job = data.job;
      setJobs((prev) => [job, ...prev]);
      resetForm();
      closeModal();
      setStatusMsg("Job posted successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post job");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePositions = async (jobId: string) => {
    if (!token || !isAdmin) return;

    const positionsNumber = parseInt(editPositionsValue, 10);
    if (Number.isNaN(positionsNumber) || positionsNumber <= 0) {
      setError("Positions must be a positive number");
      return;
    }

    setUpdatingPositions(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
        method: "PUT",
        headers: apiHeaders,
        body: JSON.stringify({ positions: positionsNumber }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      const updatedJob: Job = data.job;

      // Update jobs list
      setJobs((prev) =>
        prev.map((j) => (j.id === updatedJob.id ? updatedJob : j)),
      );

      // Update selected job if it's the one being edited
      if (selectedJob?.id === updatedJob.id) {
        setSelectedJob(updatedJob);
      }

      setEditingPositions(false);
      setEditPositionsValue("");
      setStatusMsg("Positions updated successfully.");
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update positions",
      );
    } finally {
      setUpdatingPositions(false);
    }
  };

  const handleCreatePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !isAdmin) return;

    setSubmitting(true);
    setError(null);

    if (!positionForm.name.trim()) {
      setError("Position name is required");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/jobPositions`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({
          name: positionForm.name.trim(),
          description: positionForm.description.trim() || null,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      const newPosition: JobPosition = data.jobPosition;
      setJobPositions((prev) =>
        [...prev, newPosition].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setPositionForm({ name: "", description: "" });
      setShowPositionModal(false);
      setStatusMsg("Job position created successfully.");
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create job position",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const CompactJobCard = ({ job }: { job: Job }) => {
    const badgeClass = statusTone[job.status] || "bg-gray-100 text-gray-700";
    return (
      <div className="group bg-white border border-gray-200 rounded-xl p-6 hover:shadow-xl hover:border-blue-300 transition-all duration-300 hover:-translate-y-1">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
              {job.jobCode}
            </p>
            <h3 className="text-lg font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
              {job.title}
            </h3>
          </div>
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${badgeClass} shadow-sm`}
          >
            {job.status === "onhold"
              ? "On Hold"
              : job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </span>
        </div>
        <div className="space-y-3 text-sm text-gray-600 mb-5 min-h-[56px]">
          {job.clientName && (
            <div className="flex items-center gap-2">
              <span className="text-base">🏢</span>
              <span className="font-medium">{job.clientName}</span>
            </div>
          )}
          {job.location && (
            <div className="flex items-center gap-2">
              <span className="text-base">📍</span>
              <span className="font-medium">{job.location}</span>
            </div>
          )}
        </div>
        <button
          onClick={() => {
            setSelectedJob(job);
            setShowJobDetail(true);
          }}
          className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-sm text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
        >
          View Details →
        </button>
      </div>
    );
  };

  const JobDetailModal = ({ job }: { job: Job }) => {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-40 z-50 p-4"
        onClick={() => setShowJobDetail(false)}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 rounded-t-xl">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">
                  {job.jobCode}
                </p>
                <h2 className="text-2xl font-bold text-gray-900">
                  {job.title}
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowJobDetail(false);
                  setEditingPositions(false);
                  setEditPositionsValue("");
                  setError(null);
                }}
                className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full w-9 h-9 flex items-center justify-center transition-all"
              >
                <span className="text-xl">✕</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-6 space-y-8">
            {error && (
              <div className="rounded-lg border px-4 py-3 text-sm font-semibold bg-red-50 border-red-300 text-red-800 shadow-sm flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-8 p-8 bg-gradient-to-br from-blue-50 via-gray-50 to-indigo-50 rounded-lg border border-gray-200 shadow-sm">
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Job ID
                </p>
                <p className="text-base font-medium text-gray-900">
                  {job.jobCode}
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Status
                </p>
                <p className="text-base font-medium text-gray-900 capitalize">
                  {job.status === "onhold" ? "On Hold" : job.status}
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Client
                </p>
                <p className="text-base font-medium text-gray-900">
                  {job.clientName || "Not specified"}
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Location
                </p>
                <p className="text-base font-medium text-gray-900">
                  {job.location || "Not specified"}
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Work Type
                </p>
                <p className="text-base font-medium text-gray-900 capitalize">
                  {job.workType}
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Visa Type
                </p>
                <p className="text-base font-medium text-gray-900">
                  {job.visaType || "Not specified"}
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Job Position
                </p>
                <p className="text-base font-medium text-gray-900">
                  {job.jobPositionName || "Not specified"}
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Positions
                </p>
                {isAdmin && editingPositions ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={editPositionsValue}
                      onChange={(e) => setEditPositionsValue(e.target.value)}
                      className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      onClick={() => handleUpdatePositions(job.id)}
                      disabled={updatingPositions}
                      className="px-3 py-1 rounded bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all"
                    >
                      {updatingPositions ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingPositions(false);
                        setEditPositionsValue("");
                        setError(null);
                      }}
                      disabled={updatingPositions}
                      className="px-3 py-1 rounded bg-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-300 disabled:opacity-50 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-base font-medium text-gray-900">
                      {job.positions}
                    </p>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setEditingPositions(true);
                          setEditPositionsValue(String(job.positions));
                          setError(null);
                        }}
                        className="text-blue-600 hover:text-blue-700 text-xs font-semibold hover:underline"
                        title="Edit positions"
                      >
                        ✏️ Edit
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Posted On
                </p>
                <p className="text-base font-medium text-gray-900">
                  {job.createdAt
                    ? new Date(job.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Not available"}
                </p>
              </div>
            </div>

            {job.description && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  📋 Job Description
                </h3>
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  {job.description}
                </div>
              </div>
            )}

            {!job.description && !job.descriptionPdfUrl && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  📋 Job Description
                </h3>
                <p className="text-sm text-gray-400 italic bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  No description provided
                </p>
              </div>
            )}

            {job.descriptionPdfUrl && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  📄 Detailed Job Description
                </h3>
                <a
                  href={`${API_BASE}${job.descriptionPdfUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-sm text-white font-semibold hover:bg-blue-700 shadow-md hover:shadow-lg transition-all"
                >
                  <span className="text-lg">📄</span>
                  <span>Download PDF Description</span>
                </a>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-8 py-5 rounded-b-xl">
            <button
              onClick={() => {
                setShowJobDetail(false);
                setEditingPositions(false);
                setEditPositionsValue("");
                setError(null);
              }}
              className="w-full px-5 py-3 rounded-lg bg-gray-100 text-sm text-gray-700 font-semibold hover:bg-gray-200 transition-all shadow-sm hover:shadow-md"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white py-10">
      <div className="px-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-gray-900">Job Openings</h1>
              <p className="text-sm text-gray-600 mt-1">
                {isAdmin
                  ? "Create and manage job listings for your organization"
                  : "Discover exciting career opportunities"}
              </p>
            </div>
            {isAdmin && (
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPositionModal(true)}
                  className="px-5 py-2.5 rounded-lg bg-white border-2 border-blue-600 text-sm text-blue-600 font-semibold hover:bg-blue-50 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  + Create Job Position
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-sm text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  + Post New Job
                </button>
              </div>
            )}
          </div>
          {!isAdmin && (
            <div className="inline-flex items-center gap-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-5 py-3 shadow-sm">
              <span>ℹ️</span>
              <span>Recruiters and partners have read-only access</span>
            </div>
          )}
        </div>

        {statusMsg && (
          <div className="rounded-xl border px-6 py-4 text-base font-semibold bg-blue-50 border-blue-300 text-blue-800 shadow-sm flex items-center gap-3">
            <span className="text-xl">✓</span>
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Jobs Section */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">All Positions</h2>
            {loading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Loading...</span>
              </div>
            )}
          </div>
          {jobs.length === 0 && !loading ? (
            <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white/80 backdrop-blur-sm p-12 text-center shadow-sm">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-gray-600 text-base font-medium">
                {isAdmin
                  ? "No jobs yet. Click 'Post New Job' to get started."
                  : "No open positions available right now."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {paginatedJobs.map((job) => (
                  <CompactJobCard key={job.id} job={job} />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-8 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1} to{" "}
                    {Math.min(endIndex, jobs.length)} of {jobs.length} jobs
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => (
                          <button
                            key={page}
                            onClick={() => goToPage(page)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              currentPage === page
                                ? "bg-blue-600 text-white shadow-sm"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            {page}
                          </button>
                        ),
                      )}
                    </div>
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-40 z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
              <h2 className="text-2xl font-bold text-gray-900">Post New Job</h2>
            </div>
            <div className="px-6 py-5">
              {error && (
                <div className="rounded-xl border px-5 py-4 text-sm font-semibold bg-red-50 border-red-300 text-red-800 mb-6 flex items-center gap-2 shadow-sm">
                  <span className="text-lg">⚠️</span>
                  <span>{error}</span>
                </div>
              )}
              <form
                className="grid gap-6 md:grid-cols-2"
                onSubmit={handleSubmit}
              >
                <label className="flex flex-col gap-1 text-sm text-gray-700 md:col-span-2">
                  Job Title
                  <input
                    className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                    required
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-gray-700 md:col-span-2">
                  Job Description (text)
                  <textarea
                    className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    rows={4}
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    placeholder="Overview, responsibilities, requirements"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-gray-700 md:col-span-2">
                  Job Position (optional)
                  <select
                    className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    value={form.jobPositionId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, jobPositionId: e.target.value }))
                    }
                  >
                    <option value="">-- Select Position --</option>
                    {jobPositions.map((pos) => (
                      <option key={pos.id} value={pos.id}>
                        {pos.name}
                      </option>
                    ))}
                  </select>
                  {jobPositions.length === 0 && (
                    <span className="text-xs text-gray-500 italic">
                      No job positions created yet. Click "Create Job Position"
                      to add one.
                    </span>
                  )}
                </label>

                <label className="flex flex-col gap-1 text-sm text-gray-700 md:col-span-2">
                  Job Description PDF (optional)
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          setPdfFile(file || null);
                          setPdfFileName(file?.name || null);
                        }}
                        className="text-sm hidden"
                        id="pdf-upload-modal"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          document.getElementById("pdf-upload-modal")?.click()
                        }
                        className="px-3 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm font-medium"
                      >
                        Upload PDF
                      </button>
                      {pdfFileName && (
                        <p className="text-xs text-gray-500 mt-1">
                          Selected: {pdfFileName}
                        </p>
                      )}
                    </div>
                  </div>
                </label>

                <label className="flex flex-col gap-1 text-sm text-gray-700 md:col-span-2">
                  Or paste PDF URL
                  <input
                    type="url"
                    className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="https://..."
                    value={form.descriptionPdfUrl}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        descriptionPdfUrl: e.target.value,
                      }))
                    }
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-gray-700">
                  Client Name
                  <input
                    className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    value={form.clientName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, clientName: e.target.value }))
                    }
                    placeholder="Client or end customer"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-gray-700">
                  Location
                  <input
                    className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    value={form.location}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, location: e.target.value }))
                    }
                    placeholder="City, State or Remote"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-gray-700">
                  Work Type
                  <select
                    className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    value={form.workType}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, workType: e.target.value }))
                    }
                  >
                    {workTypes.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm text-gray-700">
                  Visa Requirement
                  <select
                    className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    value={form.visaType}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, visaType: e.target.value }))
                    }
                  >
                    {visaTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm text-gray-700">
                  Number of Positions
                  <input
                    type="number"
                    min={1}
                    className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    value={form.positions}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, positions: e.target.value }))
                    }
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-gray-700">
                  Position Status
                  <select
                    className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value }))
                    }
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </form>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-xl flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="px-5 py-2 rounded-lg border-2 border-gray-300 text-sm text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                onClick={handleSubmit}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-sm text-white font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 transition-all shadow-lg hover:shadow-xl"
              >
                {submitting ? "Posting..." : "Post Job"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPositionModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-40 z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
              <h2 className="text-xl font-bold text-gray-900">
                Create Job Position
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Add a new position type for your job postings
              </p>
            </div>
            <div className="px-6 py-5">
              {error && (
                <div className="rounded-xl border px-5 py-4 text-sm font-semibold bg-red-50 border-red-300 text-red-800 mb-6 flex items-center gap-2 shadow-sm">
                  <span className="text-lg">⚠️</span>
                  <span>{error}</span>
                </div>
              )}
              <form className="space-y-4" onSubmit={handleCreatePosition}>
                <label className="flex flex-col gap-1 text-sm text-gray-700">
                  Position Name *
                  <input
                    className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    value={positionForm.name}
                    onChange={(e) =>
                      setPositionForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="e.g., Software Engineer, Product Manager"
                    required
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-gray-700">
                  Description (optional)
                  <textarea
                    className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] text-gray-900"
                    value={positionForm.description}
                    onChange={(e) =>
                      setPositionForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Brief description of this position type"
                  />
                </label>
              </form>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-xl flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowPositionModal(false);
                  setPositionForm({ name: "", description: "" });
                  setError(null);
                }}
                disabled={submitting}
                className="px-5 py-2 rounded-lg border-2 border-gray-300 text-sm text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                onClick={handleCreatePosition}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-sm text-white font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 transition-all shadow-lg hover:shadow-xl"
              >
                {submitting ? "Creating..." : "Create Position"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showJobDetail && selectedJob && <JobDetailModal job={selectedJob} />}
    </div>
  );
};
