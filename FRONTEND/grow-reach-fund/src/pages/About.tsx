import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sprout, ShoppingCart, TrendingUp, ArrowRight, Users, Globe, Heart, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import smcLogo from "@/assets/smc-logo.png";

const steps = [
  { num: "1", title: "Register", desc: "Sign up as a farmer, buyer, or creditor in under 2 minutes.", icon: Users },
  { num: "2", title: "List or Browse", desc: "Farmers list produce; buyers browse and bid on fresh crops.", icon: ShoppingCart },
  { num: "3", title: "Transact & Grow", desc: "Complete orders, track deliveries, and access micro-loans.", icon: TrendingUp },
];

const values = [
  { icon: Heart, title: "Farmer-First", desc: "We build for smallholder farmers. Every feature starts with their needs." },
  { icon: Globe, title: "Connecting Communities", desc: "Bridging the gap between rural farms and urban markets across Kenya." },
  { icon: CheckCircle, title: "Trust & Transparency", desc: "Verified identities, fair pricing, and end-to-end transaction tracking." },
];

const About = () => (
  <div className="min-h-screen bg-background">
    <Navbar />

    {/* Hero */}
    <section className="pt-28 pb-16 md:pt-36 md:pb-24">
      <div className="container mx-auto px-4 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <img src={smcLogo} alt="SMC Logo" className="h-16 w-16 rounded-full object-cover mx-auto mb-6" />
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            About <span className="text-gradient-primary">Smart Market Connect</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We're on a mission to empower Kenyan farmers by connecting them directly to buyers and affordable credit — using simple, mobile-first technology.
          </p>
        </motion.div>
      </div>
    </section>

    {/* Mission */}
    <section className="py-16 bg-card border-y border-border">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl font-display font-bold text-foreground mb-4">Our Mission</h2>
            <p className="text-muted-foreground mb-4">
              Over 75% of Kenya's population depends on agriculture, yet most smallholder farmers struggle with market access, fair pricing, and credit.
            </p>
            <p className="text-muted-foreground">
              Smart Market Connect removes middlemen, connects farmers directly to buyers, and provides data-driven credit scoring so farmers can access the loans they need to grow.
            </p>
          </motion.div>
          <motion.div
            className="grid grid-cols-2 gap-4"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            {[
              { val: "2,500+", label: "Farmers Registered" },
              { val: "47", label: "Counties Covered" },
              { val: "KES 4.2M", label: "Transactions Processed" },
              { val: "98%", label: "Farmer Satisfaction" },
            ].map((s) => (
              <div key={s.label} className="bg-background rounded-xl p-5 text-center border border-border">
                <p className="text-2xl font-display font-bold text-primary">{s.val}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>

    {/* How It Works */}
    <section className="py-20">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-display font-bold text-foreground text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              <div className="w-14 h-14 rounded-full hero-gradient flex items-center justify-center mx-auto mb-4">
                <step.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Values */}
    <section className="py-20 bg-muted">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-display font-bold text-foreground text-center mb-12">Our Values</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {values.map((v, i) => (
            <motion.div
              key={v.title}
              className="bg-card rounded-xl p-8 border border-border shadow-soft"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <v.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">{v.title}</h3>
              <p className="text-sm text-muted-foreground">{v.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-20">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl font-display font-bold text-foreground mb-4">Ready to Join?</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Whether you're a farmer, buyer, or creditor — there's a place for you on SMC.
        </p>
        <Link to="/signup">
          <Button size="lg" variant="amber">
            Get Started <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>
    </section>

    {/* Footer */}
    <footer className="py-12 bg-card border-t border-border">
      <div className="container mx-auto px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <img src={smcLogo} alt="SMC Logo" className="h-8 w-8 rounded-full object-cover" />
          <span className="font-display font-bold text-foreground">SMC</span>
        </div>
        <div className="flex justify-center gap-6 mb-4 text-sm">
          <Link to="/" className="text-muted-foreground hover:text-foreground">Home</Link>
          <Link to="/about" className="text-muted-foreground hover:text-foreground">About</Link>
          <Link to="/contact" className="text-muted-foreground hover:text-foreground">Contact</Link>
        </div>
        <p className="text-sm text-muted-foreground">&copy; 2026 Smart Market Connect. All rights reserved.</p>
      </div>
    </footer>
  </div>
);

export default About;
