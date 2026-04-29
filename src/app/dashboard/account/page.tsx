export const metadata = {
  title: "Account — TowGrade",
};

export default function AccountPage() {
  return (
    <>
      <header className="page-head">
        <span className="eyebrow">Account</span>
        <h1 className="page-title">Account settings.</h1>
        <p className="page-sub">
          Manage your operator profile, verification, and contact details.
        </p>
      </header>
      <section className="dash-stub">
        <div className="dash-stub__title">Coming soon</div>
        <div className="dash-stub__body">
          Editable profile fields, password change, and account deletion.
        </div>
      </section>
    </>
  );
}
