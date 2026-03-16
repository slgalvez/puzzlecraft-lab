import Layout from "@/components/layout/Layout";

const About = () => (
  <Layout>
    <div className="container max-w-2xl py-12">
      <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">About Puzzlecraft</h1>
      <div className="mt-6 space-y-5 text-muted-foreground leading-relaxed">
        <p>
          Puzzlecraft is a home for thoughtfully designed puzzles. We believe that a good puzzle is
          more than a pastime — it's a moment of focus, creativity, and quiet satisfaction.
        </p>
        <p>
          Our collection includes classic crosswords, number fill-ins, and word fill-ins, each
          crafted to challenge and delight solvers of every level. Whether you have five minutes
          or an hour, there's a puzzle here for you.
        </p>
        <p>
          New puzzles are added regularly, and a fresh daily puzzle awaits you every morning.
          We hope Puzzlecraft becomes a small, enjoyable part of your day.
        </p>
      </div>
    </div>
  </Layout>
);

export default About;
