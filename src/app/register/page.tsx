import RegisterForm from "./RegisterForm";

export const metadata = {
  title: "Register — TowGrade",
  description:
    "Create your verified TowGrade operator account. Free for towing companies.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="form-shell">
      <div className="form-card">
        <div className="form-head">
          <h1>Register your company</h1>
          <p>
            Free for verified towing operators. Your identity is never shared
            with any provider.
          </p>
        </div>
        <RegisterForm callbackError={params.error} />
      </div>
    </main>
  );
}
