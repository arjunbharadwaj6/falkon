import { Link } from "react-router-dom";

export function Landing() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="text-xl font-semibold tracking-tight">
            ATS Platform
          </div>
          <nav className="hidden md:flex items-center gap-6 text-slate-300">
            <a href="#about" className="hover:text-white transition-colors">
              About
            </a>
            <a href="#contact" className="hover:text-white transition-colors">
              Contact
            </a>
            <Link
              to="/login"
              className="rounded-md border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
            >
              Log In
            </Link>
            <Link
              to="/signup"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-600 opacity-20 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-fuchsia-600 opacity-10 blur-3xl" />

          <div className="mx-auto max-w-7xl px-6 py-24 lg:py-32 grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Streamline hiring with a modern, fast ATS
              </h1>
              <p className="mt-6 text-lg text-slate-300">
                Source candidates, manage pipelines, and collaborate with your
                team — all in one place. Built for speed, clarity, and scale.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-500"
                >
                  Get Started Now
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-md border border-slate-700 px-6 py-3 text-base font-medium text-slate-200 hover:bg-slate-800"
                >
                  I already have an account
                </Link>
              </div>
              <p className="mt-4 text-sm text-slate-400">
                No credit card needed. Set up in minutes.
              </p>
            </div>
            <div className="relative">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-xl">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-slate-900 p-4 border border-slate-800">
                    <p className="text-sm text-slate-400">Candidates</p>
                    <p className="mt-2 text-2xl font-semibold">10,248</p>
                  </div>
                  <div className="rounded-lg bg-slate-900 p-4 border border-slate-800">
                    <p className="text-sm text-slate-400">Open Roles</p>
                    <p className="mt-2 text-2xl font-semibold">37</p>
                  </div>
                  <div className="rounded-lg bg-slate-900 p-4 border border-slate-800">
                    <p className="text-sm text-slate-400">Time to Hire</p>
                    <p className="mt-2 text-2xl font-semibold">-32%</p>
                  </div>
                  <div className="rounded-lg bg-slate-900 p-4 border border-slate-800">
                    <p className="text-sm text-slate-400">Team Members</p>
                    <p className="mt-2 text-2xl font-semibold">18</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section
          id="about"
          className="mx-auto max-w-7xl px-6 py-20 border-t border-slate-800"
        >
          <div className="grid lg:grid-cols-3 gap-10">
            <div>
              <h2 className="text-2xl font-semibold">Why this ATS</h2>
              <p className="mt-4 text-slate-300">
                Designed for recruiters and hiring managers who value clarity
                and speed. Automate the busywork, keep candidates engaged, and
                make better decisions.
              </p>
            </div>
            <div className="lg:col-span-2 grid sm:grid-cols-2 gap-6">
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-5">
                <h3 className="font-medium">Collaborative pipelines</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Share candidate feedback, tag teammates, and move quickly with
                  role-based access.
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-5">
                <h3 className="font-medium">Powerful search</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Filter by skills, experience, and stages to find the right
                  people fast.
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-5">
                <h3 className="font-medium">Insights & reporting</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Understand bottlenecks and improve hiring with clear,
                  actionable metrics.
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-5">
                <h3 className="font-medium">Secure by default</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Built with security best practices to keep your data safe.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section
          id="contact"
          className="mx-auto max-w-3xl px-6 py-20 border-t border-slate-800"
        >
          <h2 className="text-2xl font-semibold">Contact Us</h2>
          <p className="mt-3 text-slate-300">
            Have questions or want a guided walkthrough? Send us a message and
            we’ll get back to you.
          </p>
          <form
            className="mt-8 grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              alert("Thanks for reaching out! We'll be in touch soon.");
            }}
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <input
                required
                type="text"
                name="name"
                placeholder="Your name"
                className="w-full rounded-md border border-slate-800 bg-slate-950 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-600"
              />
              <input
                required
                type="email"
                name="email"
                placeholder="Email address"
                className="w-full rounded-md border border-slate-800 bg-slate-950 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
            <textarea
              required
              name="message"
              placeholder="How can we help?"
              rows={5}
              className="w-full rounded-md border border-slate-800 bg-slate-950 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-600"
            />
            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="rounded-md bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Send Message
              </button>
              <a
                href="mailto:support@example.com"
                className="text-sm text-slate-400 hover:text-slate-200"
              >
                Or email support@example.com
              </a>
            </div>
          </form>
        </section>
      </main>

      <footer className="border-t border-slate-800 py-8">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <p>© {new Date().getFullYear()} ATS Platform. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#about" className="hover:text-slate-200">
              About
            </a>
            <a href="#contact" className="hover:text-slate-200">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
