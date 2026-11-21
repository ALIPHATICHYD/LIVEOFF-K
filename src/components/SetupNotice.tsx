export function SetupNotice() {
  return (
    <div className="card mx-auto my-10 max-w-xl p-6">
      <h2 className="text-lg font-bold">Connect Supabase to see live data</h2>
      <p className="mt-2 text-muted">
        Copy <code>.env.example</code> to <code>.env.local</code>, add your Supabase URL and publishable key,
        then restart <code>npm run dev</code>. See the README for the full setup.
      </p>
    </div>
  );
}
