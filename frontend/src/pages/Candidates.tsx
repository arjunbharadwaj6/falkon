import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import Papa from "papaparse";

type Candidate = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  visaStatus: string | null;
  experience: number | null;
  profileStatus: string;
  linkedinUrl: string | null;
  resumeUrl: string | null;
  jobId?: string | null;
  jobPositionId?: string | null;
  accountId?: string;
  createdBy?: string;
  createdByUsername?: string | null;
  createdByEmail?: string | null;
  additionalComments?: string | null;
  created_at?: string;
  updated_at?: string;
};

type JobPosition = {
  id: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type Job = {
  id: string;
  jobCode: string;
  title: string;
  jobPositionId?: string | null;
  jobPositionName?: string | null;
  status: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const profileStatusOptions = [
  { value: "submitted", label: "Submitted" },
  { value: "selected", label: "Selected" },
  { value: "screening", label: "Screening" },
  { value: "interview", label: "Interview" },
  { value: "offered", label: "Offered" },
  { value: "hired", label: "Hired" },
  { value: "rejected", label: "Rejected" },
  { value: "on-hold", label: "On Hold" },
];

const visaStatusOptions = [
  { value: "citizen", label: "US Citizen" },
  { value: "green-card", label: "Green Card" },
  { value: "h1b", label: "H1B" },
  { value: "opt", label: "OPT" },
  { value: "cpt", label: "CPT" },
  { value: "other", label: "Other" },
  { value: "needs-sponsorship", label: "Needs Sponsorship" },
];

const profileStatusColor = (status: string) => {
  switch (status) {
    case "submitted":
      return "bg-blue-50 text-blue-800 border border-blue-200";
    case "selected":
      return "bg-purple-50 text-purple-800 border border-purple-200";
    case "screening":
      return "bg-amber-50 text-amber-800 border border-amber-200";
    case "interview":
      return "bg-cyan-50 text-cyan-800 border border-cyan-200";
    case "offered":
      return "bg-green-50 text-green-800 border border-green-200";
    case "hired":
      return "bg-emerald-50 text-emerald-800 border border-emerald-200";
    case "rejected":
      return "bg-red-50 text-red-800 border border-red-200";
    case "on-hold":
      return "bg-yellow-50 text-amber-800 border border-amber-200";
    default:
      return "bg-gray-100 text-gray-800 border border-gray-200";
  }
};

const toLabel = (value: string, options: typeof profileStatusOptions) =>
  options.find((o) => o.value === value)?.label ?? value;

type StatTone = "blue" | "emerald" | "red" | "amber";

const toneStyles: Record<StatTone, { bg: string; text: string }> = {
  blue: { bg: "bg-blue-50", text: "text-blue-800" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-800" },
  red: { bg: "bg-red-50", text: "text-red-800" },
  amber: { bg: "bg-amber-50", text: "text-amber-800" },
};

const StatCard = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: StatTone;
}) => (
  <div
    className={`p-4 rounded-lg shadow-sm border border-gray-200 ${toneStyles[tone].bg} ${toneStyles[tone].text}`}
  >
    <p className="text-sm font-semibold">{label}</p>
    <p className="text-3xl font-bold">{value}</p>
  </div>
);

export const Candidates: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { token, account } = useAuth();
  const isStaff = account?.role === "recruiter" || account?.role === "partner";
  const [stats, setStats] = useState({
    total: 0,
    accepted: 0,
    rejected: 0,
    pending: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(
    new Set(),
  );

  const [form, setForm] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
    location: "",
    visaStatus: "",
    experience: "",
    profileStatus: "submitted",
    linkedinUrl: "",
    resumeUrl: "",
    jobPositionId: "",
    jobId: "",
    additionalComments: "",
    createdBy: "",
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [recruiters, setRecruiters] = useState<
    Array<{ id: string; email: string; username?: string }>
  >([]);
  const [filters, setFilters] = useState({
    search: "",
    jobPositionId: "",
    jobId: "",
    profileStatus: "",
    visaStatus: "",
    location: "",
    minExperience: "",
    maxExperience: "",
  });
  const [filtersOpen, setFiltersOpen] = useState(true);

  // CSV Import state
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [csvStep, setCsvStep] = useState<"upload" | "mapping" | "preview">(
    "upload",
  );
  const [csvImporting, setCsvImporting] = useState(false);

  const availableFields = [
    "name",
    "email",
    "phone",
    "location",
    "visaStatus",
    "experience",
    "profileStatus",
    "linkedinUrl",
    "jobPositionId",
    "jobId",
    "additionalComments",
    "createdBy",
  ];

  const apiHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    }),
    [token],
  );

  const fetchCandidates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/candidates`, {
        headers: apiHeaders,
      });
      if (!res.ok) {
        throw new Error(`Failed to load candidates (${res.status})`);
      }
      const data = await res.json();
      setCandidates(data.candidates || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load candidates",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/candidates/stats/summary`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  const fetchJobs = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/jobs`, {
        headers: apiHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        const activeJobs = (data.jobs || []).filter(
          (job: any) => job.status === "active",
        );
        setJobs(activeJobs);
      }
    } catch (err) {
      console.error("Failed to fetch jobs", err);
    }
  };

  const fetchJobPositions = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/jobPositions`, {
        headers: apiHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        setJobPositions(data.jobPositions || []);
      }
    } catch (err) {
      console.error("Failed to fetch job positions", err);
    }
  };

  const fetchRecruiters = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/auth/accounts`, {
        headers: apiHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        const recruitersData = data.accounts || [];
        setRecruiters(recruitersData);
      }
    } catch (err) {
      console.error("Failed to fetch recruiters", err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCandidates();
      fetchStats();
      fetchJobs();
      fetchJobPositions();
      if (!isStaff) {
        fetchRecruiters();
      }
    }
  }, [token]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const resetForm = () => {
    setForm({
      id: "",
      name: "",
      email: "",
      phone: "",
      location: "",
      visaStatus: "",
      experience: "",
      profileStatus: "submitted",
      linkedinUrl: "",
      resumeUrl: "",
      jobPositionId: "",
      jobId: "",
      additionalComments: "",
      createdBy: "",
    });
    setResumeFile(null);
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Force profileStatus to "submitted" for non-admin users
    const profileStatus = isStaff ? "submitted" : form.profileStatus;

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      profileStatus,
    };

    if (!payload.name) {
      setError("Name is required");
      setSubmitting(false);
      return;
    }

    if (form.email) payload.email = form.email.trim();
    if (form.phone) payload.phone = form.phone.trim();
    if (form.location) payload.location = form.location.trim();
    if (form.visaStatus) payload.visaStatus = form.visaStatus;
    if (form.experience) payload.experience = Number(form.experience);
    if (form.linkedinUrl) payload.linkedinUrl = form.linkedinUrl.trim();
    if (form.jobPositionId) payload.jobPositionId = form.jobPositionId;
    if (form.jobId) payload.jobId = form.jobId;
    if (form.additionalComments)
      payload.additionalComments = form.additionalComments.trim();
    if (form.createdBy) payload.createdBy = form.createdBy;

    // Upload resume file if selected
    if (resumeFile) {
      try {
        const formData = new FormData();
        formData.append("resume", resumeFile);

        const uploadRes = await fetch(`${API_BASE}/api/upload`, {
          method: "POST",
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: formData,
        });

        if (!uploadRes.ok) {
          const errBody = await uploadRes.json().catch(() => ({}));
          throw new Error(errBody.error || "Failed to upload resume");
        }

        const uploadData = await uploadRes.json();
        payload.resumeUrl = uploadData.url;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to upload resume",
        );
        setSubmitting(false);
        return;
      }
    } else if (form.resumeUrl) {
      payload.resumeUrl = form.resumeUrl.trim();
    }

    const isEditing = Boolean(form.id);
    const url = isEditing
      ? `${API_BASE}/api/candidates/${form.id}`
      : `${API_BASE}/api/candidates`;
    const method = isEditing ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: apiHeaders,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      const candidate: Candidate = data.candidate;

      if (isEditing) {
        setCandidates((prev) =>
          prev.map((c) => (c.id === candidate.id ? candidate : c)),
        );
        if (selected && selected.id === candidate.id) {
          setSelected(candidate);
        }
      } else {
        setCandidates((prev) => [candidate, ...prev]);
      }

      resetForm();
      fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save candidate");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (candidate: Candidate) => {
    setForm({
      id: candidate.id,
      name: candidate.name,
      email: candidate.email || "",
      phone: candidate.phone || "",
      location: candidate.location || "",
      visaStatus: candidate.visaStatus || "",
      experience: candidate.experience?.toString() || "",
      profileStatus: candidate.profileStatus,
      linkedinUrl: candidate.linkedinUrl || "",
      resumeUrl: candidate.resumeUrl || "",
      jobPositionId: candidate.jobPositionId || "",
      jobId: candidate.jobId || "",
      additionalComments: (candidate as any).additionalComments || "",
      createdBy: (candidate as any).createdBy || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (candidate: Candidate) => {
    const confirmed = window.confirm(`Delete ${candidate.name}?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/api/candidates/${candidate.id}`, {
        method: "DELETE",
        headers: apiHeaders,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Delete failed (${res.status})`);
      }

      setCandidates((prev) => prev.filter((c) => c.id !== candidate.id));
      if (selected?.id === candidate.id) {
        setSelected(null);
      }
      if (form.id === candidate.id) {
        resetForm();
      }
      fetchStats();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete candidate",
      );
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedCandidates.size === 0) return;

    const confirmed = window.confirm(
      `Delete ${selectedCandidates.size} candidate(s)? This action cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const candidateId of selectedCandidates) {
        try {
          const res = await fetch(`${API_BASE}/api/candidates/${candidateId}`, {
            method: "DELETE",
            headers: apiHeaders,
          });

          if (res.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch {
          errorCount++;
        }
      }

      setCandidates((prev) =>
        prev.filter((c) => !selectedCandidates.has(c.id)),
      );
      setSelectedCandidates(new Set());
      setError(
        `Deleted: ${successCount} candidate(s)${errorCount > 0 ? `, Failed: ${errorCount}` : ""}`,
      );
      fetchStats();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete candidates",
      );
    }
  };

  const handleSelectCandidate = (candidateId: string) => {
    const newSelected = new Set(selectedCandidates);
    if (newSelected.has(candidateId)) {
      newSelected.delete(candidateId);
    } else {
      newSelected.add(candidateId);
    }
    setSelectedCandidates(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCandidates.size === filteredCandidates.length) {
      setSelectedCandidates(new Set());
    } else {
      setSelectedCandidates(new Set(filteredCandidates.map((c) => c.id)));
    }
  };

  const handleView = (candidate: Candidate) => {
    setSelected(candidate);
    setShowViewModal(true);
  };

  const filteredCandidates = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();
    const minExpValue =
      filters.minExperience !== "" ? Number(filters.minExperience) : null;
    const maxExpValue =
      filters.maxExperience !== "" ? Number(filters.maxExperience) : null;
    const minExp = Number.isNaN(minExpValue) ? null : minExpValue;
    const maxExp = Number.isNaN(maxExpValue) ? null : maxExpValue;

    return candidates.filter((candidate) => {
      if (searchTerm) {
        const haystack = [
          candidate.name,
          candidate.email,
          candidate.phone,
          candidate.location,
          candidate.linkedinUrl,
          candidate.resumeUrl,
        ]
          .filter(Boolean)
          .map((v) => String(v).toLowerCase())
          .join(" ");

        if (!haystack.includes(searchTerm)) return false;
      }

      if (filters.location) {
        const loc = candidate.location?.toLowerCase() || "";
        if (!loc.includes(filters.location.trim().toLowerCase())) return false;
      }

      if (
        filters.profileStatus &&
        candidate.profileStatus !== filters.profileStatus
      ) {
        return false;
      }

      if (filters.visaStatus && candidate.visaStatus !== filters.visaStatus) {
        return false;
      }

      if (
        filters.jobPositionId &&
        candidate.jobPositionId !== filters.jobPositionId
      ) {
        return false;
      }

      if (filters.jobId && candidate.jobId !== filters.jobId) {
        return false;
      }

      if (minExp !== null) {
        const exp = candidate.experience ?? -1;
        if (exp < minExp) return false;
      }

      if (maxExp !== null) {
        const exp = candidate.experience ?? Number.MAX_SAFE_INTEGER;
        if (exp > maxExp) return false;
      }

      return true;
    });
  }, [candidates, filters]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCandidates.length / itemsPerPage),
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCandidates = filteredCandidates.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // CSV Import handlers
  const handleCsvFileSelect = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.data && result.data.length > 0) {
          const headers = Object.keys(
            result.data[0] as Record<string, unknown>,
          );
          setCsvHeaders(headers);
          setCsvData(result.data as Record<string, string>[]);
          setCsvStep("mapping");
        }
      },
      error: (error) => {
        setError(`CSV parsing error: ${error.message}`);
      },
    });
  };

  const handleCsvImport = async () => {
    if (csvData.length === 0) {
      setError("No data to import");
      return;
    }

    setCsvImporting(true);
    setError(null);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const row of csvData) {
        const payload: Record<string, unknown> = {};

        // Map CSV columns to candidate fields
        for (const [csvHeader, candidateField] of Object.entries(
          fieldMapping,
        )) {
          if (candidateField && row[csvHeader]) {
            const value = row[csvHeader].trim();

            // Type conversion based on field
            if (candidateField === "experience") {
              payload[candidateField] = Number(value);
            } else if (
              candidateField === "visaStatus" ||
              candidateField === "profileStatus"
            ) {
              payload[candidateField] = value;
            } else if (candidateField === "createdBy") {
              // Match recruiter by email or username
              const recruiter = recruiters.find(
                (r) =>
                  r.email.toLowerCase() === value.toLowerCase() ||
                  r.username?.toLowerCase() === value.toLowerCase(),
              );
              if (recruiter) {
                payload[candidateField] = recruiter.id;
              }
            } else {
              payload[candidateField] = value;
            }
          }
        }

        if (!payload.name) {
          errorCount++;
          continue;
        }

        // Force profileStatus to "submitted" for non-admin users
        if (isStaff) {
          payload.profileStatus = "submitted";
        }

        try {
          const res = await fetch(`${API_BASE}/api/candidates`, {
            method: "POST",
            headers: apiHeaders,
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch {
          errorCount++;
        }
      }

      setError(`Import completed: ${successCount} added, ${errorCount} failed`);
      setCsvImporting(false);
      setShowCsvModal(false);
      setCsvStep("upload");
      setCsvHeaders([]);
      setCsvData([]);
      setFieldMapping({});
      await fetchCandidates();
      fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setCsvImporting(false);
    }
  };

  const resetCsvModal = () => {
    setShowCsvModal(false);
    setCsvStep("upload");
    setCsvHeaders([]);
    setCsvData([]);
    setFieldMapping({});
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 px-6 py-10 md:px-12 lg:px-16 space-y-8 text-slate-900">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Candidates
          </h1>
          <p className="text-sm text-slate-600">
            Track and manage your pipeline with quick filters and richer
            context.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/30"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            + Add candidate
          </button>
          <button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-md shadow-green-500/30"
            onClick={() => setShowCsvModal(true)}
          >
            📤 Import CSV
          </button>
          {selectedCandidates.size > 0 && (
            <button
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-md shadow-red-500/30"
              onClick={handleDeleteSelected}
            >
              🗑️ Delete ({selectedCandidates.size})
            </button>
          )}
        </div>
      </div>

      {isStaff && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Added" value={stats.total} tone="blue" />
          <StatCard label="Accepted" value={stats.accepted} tone="emerald" />
          <StatCard label="Rejected" value={stats.rejected} tone="red" />
          <StatCard label="Pending" value={stats.pending} tone="amber" />
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 px-4 py-3 shadow-sm">
          {error}
        </div>
      )}

      {/* Details card removed in favor of modal view */}

      <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg shadow-gray-200/70 p-5 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-700 text-sm font-bold">
                F
              </span>
              Filters
            </h3>
            <button
              type="button"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              onClick={() => setFiltersOpen((v) => !v)}
            >
              {filtersOpen ? "Hide" : "Show"}
            </button>
          </div>
          {filtersOpen && (
            <button
              type="button"
              className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
              onClick={() =>
                setFilters({
                  search: "",
                  jobPositionId: "",
                  jobId: "",
                  profileStatus: "",
                  visaStatus: "",
                  location: "",
                  minExperience: "",
                  maxExperience: "",
                })
              }
            >
              Clear filters
            </button>
          )}
        </div>
        {filtersOpen && (
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">
                Search (name, email, phone, links)
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                placeholder="e.g., Jane, 555, linkedin"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">
                Position Title
              </label>
              <select
                value={filters.jobPositionId}
                onChange={(e) =>
                  setFilters({ ...filters, jobPositionId: e.target.value })
                }
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any</option>
                {jobPositions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">Job</label>
              <select
                value={filters.jobId}
                onChange={(e) =>
                  setFilters({ ...filters, jobId: e.target.value })
                }
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.jobCode} - {job.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">
                Profile Status
              </label>
              <select
                value={filters.profileStatus}
                onChange={(e) =>
                  setFilters({ ...filters, profileStatus: e.target.value })
                }
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any</option>
                {profileStatusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">
                Visa Status
              </label>
              <select
                value={filters.visaStatus}
                onChange={(e) =>
                  setFilters({ ...filters, visaStatus: e.target.value })
                }
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any</option>
                {visaStatusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">
                Location
              </label>
              <input
                type="text"
                value={filters.location}
                onChange={(e) =>
                  setFilters({ ...filters, location: e.target.value })
                }
                placeholder="City, state, country"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">
                Min Experience (yrs)
              </label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={filters.minExperience}
                onChange={(e) =>
                  setFilters({ ...filters, minExperience: e.target.value })
                }
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">
                Max Experience (yrs)
              </label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={filters.maxExperience}
                onChange={(e) =>
                  setFilters({ ...filters, maxExperience: e.target.value })
                }
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-xl shadow-gray-200/70 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 font-bold">
              C
            </span>
            All candidates
          </h2>
          {loading && <span className="text-xs text-gray-500">Loading...</span>}
        </div>
        <table className="w-full">
          <thead className="bg-gray-50/80 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-12">
                <input
                  type="checkbox"
                  checked={
                    selectedCandidates.size === filteredCandidates.length &&
                    filteredCandidates.length > 0
                  }
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                />
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Name
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Email
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Location
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Visa Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Profile Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Job Position
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Job
              </th>
              {!isStaff && (
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Added By
                </th>
              )}
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredCandidates.length === 0 && !loading ? (
              <tr>
                <td
                  className="px-6 py-4 text-sm text-gray-500"
                  colSpan={isStaff ? 9 : 10}
                >
                  No candidates found. Adjust filters or add one above.
                </td>
              </tr>
            ) : (
              paginatedCandidates.map((candidate) => (
                <tr
                  key={candidate.id}
                  className="hover:bg-blue-50/40 transition-colors"
                >
                  <td className="px-4 py-4 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedCandidates.has(candidate.id)}
                      onChange={() => handleSelectCandidate(candidate.id)}
                      className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900 font-semibold">
                    {candidate.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {candidate.email || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {candidate.location || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {candidate.visaStatus
                      ? toLabel(candidate.visaStatus, visaStatusOptions)
                      : "-"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-semibold ${profileStatusColor(candidate.profileStatus)}`}
                    >
                      {toLabel(candidate.profileStatus, profileStatusOptions)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {candidate.jobPositionId
                      ? jobPositions.find(
                          (p) => p.id === candidate.jobPositionId,
                        )?.name || "-"
                      : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {candidate.jobId
                      ? (() => {
                          const job = jobs.find(
                            (j) => j.id === candidate.jobId,
                          );
                          return job ? `${job.jobCode} - ${job.title}` : "-";
                        })()
                      : "-"}
                  </td>
                  {!isStaff && (
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {candidate.createdByUsername ||
                        candidate.createdByEmail ||
                        "-"}
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm flex gap-3 text-slate-900">
                    <button
                      className="text-blue-600 hover:text-blue-800 font-semibold"
                      onClick={() => handleView(candidate)}
                    >
                      View
                    </button>
                    <button
                      className="text-amber-600 hover:text-amber-700 font-semibold"
                      onClick={() => handleEdit(candidate)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-600 hover:text-red-700 font-semibold"
                      onClick={() => handleDelete(candidate)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to{" "}
              {Math.min(endIndex, filteredCandidates.length)} of{" "}
              {filteredCandidates.length} candidates
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
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-200 rounded-lg shadow-2xl shadow-gray-200/80 w-full max-w-2xl p-6 relative text-slate-900">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              onClick={() => setShowModal(false)}
              aria-label="Close"
            >
              ✕
            </button>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              {form.id ? "Edit candidate" : "Add candidate"}
            </h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col text-sm text-gray-800 gap-1">
                  Name
                  <input
                    className="border border-gray-300 bg-white text-gray-900 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </label>

                <label className="flex flex-col text-sm text-gray-800 gap-1">
                  Email
                  <input
                    type="email"
                    className="border border-gray-300 bg-white text-gray-900 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="john@example.com"
                  />
                </label>

                <label className="flex flex-col text-sm text-gray-800 gap-1">
                  Phone
                  <input
                    type="tel"
                    className="border border-gray-300 bg-white text-gray-900 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    placeholder="+1 (555) 123-4567"
                  />
                </label>

                <label className="flex flex-col text-sm text-gray-800 gap-1">
                  Location
                  <input
                    className="border border-gray-300 bg-white text-gray-900 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                    value={form.location}
                    onChange={(e) =>
                      setForm({ ...form, location: e.target.value })
                    }
                    placeholder="San Francisco, CA"
                  />
                </label>

                <label className="flex flex-col text-sm text-gray-800 gap-1">
                  Visa Status
                  <select
                    className="border border-gray-300 bg-white text-gray-900 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.visaStatus}
                    onChange={(e) =>
                      setForm({ ...form, visaStatus: e.target.value })
                    }
                  >
                    <option value="">-- Select --</option>
                    {visaStatusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col text-sm text-gray-800 gap-1">
                  Experience (years)
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    className="border border-gray-300 bg-white text-gray-900 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.experience}
                    onChange={(e) =>
                      setForm({ ...form, experience: e.target.value })
                    }
                    placeholder="e.g., 5"
                  />
                </label>

                <label className="flex flex-col text-sm text-gray-800 gap-1">
                  Profile Status
                  <select
                    className="border border-gray-300 bg-white text-gray-900 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    value={form.profileStatus}
                    onChange={(e) =>
                      setForm({ ...form, profileStatus: e.target.value })
                    }
                    disabled={isStaff}
                  >
                    {profileStatusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                  {isStaff && (
                    <span className="text-xs text-gray-500 italic">
                      Only admins can change profile status
                    </span>
                  )}
                </label>

                <label className="flex flex-col text-sm text-gray-800 gap-1">
                  Position Title
                  <select
                    className="border border-gray-300 bg-white text-gray-900 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.jobPositionId}
                    onChange={(e) =>
                      setForm({ ...form, jobPositionId: e.target.value })
                    }
                  >
                    <option value="">
                      -- Select Position Title (Optional) --
                    </option>
                    {jobPositions.map((position) => (
                      <option key={position.id} value={position.id}>
                        {position.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col text-sm text-gray-800 gap-1">
                  Job ID
                  <select
                    className="border border-gray-300 bg-white text-gray-900 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.jobId}
                    onChange={(e) =>
                      setForm({ ...form, jobId: e.target.value })
                    }
                  >
                    <option value="">
                      -- Select Job ID (Optional) --
                    </option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.jobCode} - {job.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col text-sm text-gray-800 gap-1">
                  LinkedIn URL
                  <input
                    type="url"
                    className="border border-gray-300 bg-white text-gray-900 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                    placeholder="https://linkedin.com/in/..."
                    value={form.linkedinUrl}
                    onChange={(e) =>
                      setForm({ ...form, linkedinUrl: e.target.value })
                    }
                  />
                </label>

                <label className="flex flex-col text-sm text-gray-800 gap-1">
                  Additional Comments
                  <textarea
                    className="border border-gray-300 bg-white text-gray-900 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 resize-none"
                    placeholder="Add any additional notes or comments..."
                    rows={3}
                    value={form.additionalComments}
                    onChange={(e) =>
                      setForm({ ...form, additionalComments: e.target.value })
                    }
                  />
                </label>

                {!isStaff && (
                  <label className="flex flex-col text-sm text-gray-800 gap-1">
                    Added By
                    <select
                      className="border border-gray-300 bg-white text-gray-900 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.createdBy}
                      onChange={(e) =>
                        setForm({ ...form, createdBy: e.target.value })
                      }
                    >
                      <option value="">
                        -- Select Recruiter (Optional) --
                      </option>
                      {recruiters.map((recruiter) => (
                        <option key={recruiter.id} value={recruiter.id}>
                          {recruiter.username || recruiter.email}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="flex flex-col text-sm text-gray-800 gap-1">
                  Resume (PDF)
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="application/pdf"
                      className="border border-gray-300 bg-white text-gray-900 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.type !== "application/pdf") {
                            alert("Only PDF files are allowed");
                            e.target.value = "";
                            return;
                          }
                          if (file.size > 5 * 1024 * 1024) {
                            alert("File size must be less than 5MB");
                            e.target.value = "";
                            return;
                          }
                          setResumeFile(file);
                          setForm({ ...form, resumeUrl: "" });
                        }
                      }}
                    />
                    {resumeFile && (
                      <div className="text-sm text-green-700">
                        Selected: {resumeFile.name} (
                        {(resumeFile.size / 1024).toFixed(2)} KB)
                      </div>
                    )}
                    {form.resumeUrl && !resumeFile && (
                      <div className="text-sm text-gray-700">
                        Current:{" "}
                        <a
                          href={`${API_BASE}${form.resumeUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View Resume
                        </a>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 shadow shadow-blue-200/70"
                >
                  {submitting
                    ? "Saving..."
                    : form.id
                      ? "Save changes"
                      : "Add candidate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40">
          <div className="bg-white border border-gray-200 rounded-lg shadow-2xl shadow-gray-200/80 w-full max-w-xl max-h-[90vh] flex flex-col relative text-slate-900">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 z-10"
              onClick={() => setShowViewModal(false)}
              aria-label="Close"
            >
              ✕
            </button>
            <h2 className="text-xl font-semibold text-slate-900 mb-4 p-6 pb-0">
              Candidate details
            </h2>
            <div className="space-y-3 text-sm text-slate-900 overflow-y-auto flex-1 p-6 pt-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Name:</span>
                <span>{selected.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Email:</span>
                <span>{selected.email || "-"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Phone:</span>
                <span>{selected.phone || "-"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Location:</span>
                <span>{selected.location || "-"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Visa Status:</span>
                <span>
                  {selected.visaStatus
                    ? toLabel(selected.visaStatus, visaStatusOptions)
                    : "-"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Experience:</span>
                <span>{selected.experience ?? "-"} years</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Profile Status:</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${profileStatusColor(selected.profileStatus)}`}
                >
                  {toLabel(selected.profileStatus, profileStatusOptions)}
                </span>
              </div>
              {selected.linkedinUrl && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">LinkedIn:</span>
                  <a
                    className="text-blue-600 hover:text-blue-800 underline"
                    href={selected.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View profile
                  </a>
                </div>
              )}
              {!selected.linkedinUrl && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">LinkedIn:</span>
                  <span>-</span>
                </div>
              )}
              {selected.resumeUrl && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Resume:</span>
                  <a
                    className="text-blue-600 hover:text-blue-800 underline"
                    href={
                      selected.resumeUrl.startsWith("http")
                        ? selected.resumeUrl
                        : `${API_BASE}${selected.resumeUrl}`
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    View resume
                  </a>
                </div>
              )}
              {!selected.resumeUrl && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Resume:</span>
                  <span>-</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="font-semibold">Job:</span>
                <span>
                  {selected.jobId
                    ? jobs.find((j) => j.id === selected.jobId)?.title || "-"
                    : "-"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Position Title:</span>
                <span>
                  {selected.jobPositionId
                    ? jobPositions.find((p) => p.id === selected.jobPositionId)
                        ?.name || "-"
                    : "-"}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <span className="font-semibold">Additional Comments:</span>
                <span className="bg-gray-50 p-2 rounded text-xs whitespace-pre-wrap">
                  {(selected as any).additionalComments || "-"}
                </span>
              </div>
              {(selected.createdByUsername || selected.createdByEmail) && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Added by:</span>
                  <span>
                    {selected.createdByUsername ||
                      selected.createdByEmail ||
                      "-"}
                  </span>
                </div>
              )}
              {selected.created_at && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Created:</span>
                  <span>
                    {new Date(selected.created_at).toLocaleDateString()} at{" "}
                    {new Date(selected.created_at).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
            <div className="border-t border-gray-200 p-6 flex items-center justify-end gap-3 bg-gray-50 rounded-b-lg">
              <button
                type="button"
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => setShowViewModal(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-md text-white bg-amber-600 hover:bg-amber-700"
                onClick={() => {
                  setShowViewModal(false);
                  handleEdit(selected);
                }}
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl overflow-auto max-h-[90vh]">
            <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Import Candidates from CSV
              </h2>
              <button
                onClick={resetCsvModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-4">
              {csvStep === "upload" && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Upload a CSV file with candidate information. The first row
                    should contain column headers.
                  </p>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleCsvFileSelect(file);
                        }
                      }}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label
                      htmlFor="csv-upload"
                      className="cursor-pointer block"
                    >
                      <div className="text-4xl mb-2">📁</div>
                      <p className="font-medium text-gray-900">
                        Click to upload CSV
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        or drag and drop
                      </p>
                    </label>
                  </div>
                </div>
              )}

              {csvStep === "mapping" && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Map CSV columns to candidate fields. Leave unmapped columns
                    blank.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                    💡 Tip: Map a column to "createdBy" and enter recruiter
                    email or username. It will automatically match with your
                    recruiters.
                  </div>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {csvHeaders.map((header) => (
                      <div
                        key={header}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded"
                      >
                        <label className="w-40 text-sm font-medium text-gray-700">
                          {header}
                        </label>
                        <select
                          value={fieldMapping[header] || ""}
                          onChange={(e) => {
                            setFieldMapping({
                              ...fieldMapping,
                              [header]: e.target.value,
                            });
                          }}
                          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Skip this column --</option>
                          {availableFields.map((field) => (
                            <option key={field} value={field}>
                              {field}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    Found {csvData.length} rows to import
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={resetCsvModal}
              >
                Cancel
              </button>
              {csvStep === "mapping" && (
                <button
                  type="button"
                  disabled={csvImporting}
                  className="px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-60"
                  onClick={handleCsvImport}
                >
                  {csvImporting ? "Importing..." : "Import Candidates"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
