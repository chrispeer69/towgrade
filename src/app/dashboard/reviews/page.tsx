export const metadata = {
  title: "My reviews — TowGrade",
};

export default function ReviewsPage() {
  return (
    <>
      <header className="page-head">
        <span className="eyebrow">My reviews</span>
        <h1 className="page-title">Your submitted reviews.</h1>
        <p className="page-sub">
          A log of every review you have submitted, with public/private status
          and edit access.
        </p>
      </header>
      <section className="dash-stub">
        <div className="dash-stub__title">Coming soon</div>
        <div className="dash-stub__body">
          The review log lands once submission is wired up.
        </div>
      </section>
    </>
  );
}
