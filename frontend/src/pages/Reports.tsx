import React from "react";

export const Reports: React.FC = () => {
  const reports = [
    {
      id: 1,
      title: "Hiring Pipeline Report",
      date: "2024-01-15",
      status: "Completed",
    },
    {
      id: 2,
      title: "Time to Hire Analysis",
      date: "2024-01-10",
      status: "Completed",
    },
    {
      id: 3,
      title: "Candidate Source Report",
      date: "2024-01-05",
      status: "In Progress",
    },
    {
      id: 4,
      title: "Department Hiring Summary",
      date: "2024-01-01",
      status: "Completed",
    },
  ];

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-gray-800 mb-6">Reports</h1>
      <button className="mb-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold">
        + Generate New Report
      </button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <div
            key={report.id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {report.title}
                </h3>
                <p className="text-sm text-gray-500">{report.date}</p>
              </div>
              <span
                className={`text-xs px-3 py-1 rounded-full font-semibold ${
                  report.status === "Completed"
                    ? "bg-green-100 text-green-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {report.status}
              </span>
            </div>
            <div className="flex gap-3">
              <button className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 py-2 rounded font-semibold transition">
                View Report
              </button>
              <button className="flex-1 bg-gray-50 text-gray-600 hover:bg-gray-100 py-2 rounded font-semibold transition">
                Download
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
