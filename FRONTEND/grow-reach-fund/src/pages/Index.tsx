import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sprout, ShoppingCart, TrendingUp, ArrowRight, Leaf, Shield, BarChart3 } from "lucide-react";
import smcLogo from "@/assets/smc-logo.png";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: "easeOut" as const },
  }),
};

const features = [
  {
    icon: Sprout,
    title: "For Farmers",
    desc: "Manage your farm, track inventory, process payments and organize your workforce — all in one place.",
    link: "/signup?role=farmer",
  },
  {
    icon: ShoppingCart,
    title: "For Buyers",
    desc: "Browse fresh produce directly from local farms. Add to cart, checkout and get it delivered.",
    link: "/signup?role=buyer",
  },
  {
    icon: TrendingUp,
    title: "For Creditors",
    desc: "Assess credit risk with real-time farm data, credit scoring and analytics dashboards.",
    link: "/signup?role=creditor",
  },
];

const stats = [
  { value: "2,500+", label: "Active Farmers" },
  { value: "15K+", label: "Products Listed" },
  { value: "$4.2M", label: "Transactions" },
  { value: "98%", label: "Satisfaction" },
];

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero with background video */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
            poster="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1920&q=80"
          >
            <source
              src="https://videos.pexels.com/video-files/2889413/2889413-sd_640_360_30fps.mp4"
              type="video/mp4"
            />
          </video>
          <div className="absolute inset-0 hero-gradient opacity-80" />
        </div>

        <div className="relative container mx-auto px-4 pt-20">
          <motion.div
            className="max-w-2xl"
            initial="hidden"
            animate="visible"
          >
            <motion.p variants={fadeUp} custom={0} className="text-accent font-semibold tracking-wide uppercase text-sm mb-4">
              Smart Market Connect
            </motion.p>
            <motion.h1 variants={fadeUp} custom={1} className="text-5xl md:text-7xl font-display font-bold text-primary-foreground leading-tight mb-6">
              Farm to Market,{" "}
              <span className="text-accent">Simplified</span>
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="text-lg text-primary-foreground/80 mb-8 max-w-lg">
              Connecting farmers, buyers, and creditors on one intelligent platform. Grow your business with data-driven insights.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex flex-wrap gap-4">
              <Link to="/signup">
                <Button variant="amber" size="lg" className="text-base min-h-[48px]">
                  Get Started <ArrowRight className="ml-1 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/signin">
                <Button variant="heroOutline" size="lg" className="text-base min-h-[48px]">
                  Sign In
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-card border-b border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <p className="text-3xl md:text-4xl font-bold font-display text-primary">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-display font-bold text-foreground mb-4">One Platform, Three Roles</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Whether you grow it, buy it, or finance it — SMC has you covered.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="group bg-card rounded-xl p-8 shadow-soft hover:shadow-elevated transition-all duration-300 border border-border hover:border-primary/20"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <div className="w-12 h-12 rounded-lg hero-gradient flex items-center justify-center mb-5">
                  <f.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-display font-semibold text-foreground mb-3">{f.title}</h3>
                <p className="text-muted-foreground text-sm mb-5">{f.desc}</p>
                <Link to={f.link} className="inline-flex items-center text-sm font-medium text-primary group-hover:gap-2 transition-all">
                  Join as {f.title.split(" ")[1]} <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why SMC */}
      <section className="py-24 bg-muted">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-display font-bold text-foreground mb-6">
                Why Choose <span className="text-gradient-primary">SMC</span>?
              </h2>
              <div className="space-y-6">
                {[
                  { icon: Leaf, title: "Direct Farm Access", desc: "No middlemen. Connect directly with verified local farmers." },
                  { icon: Shield, title: "Secure Transactions", desc: "End-to-end encrypted payments and verified identities." },
                  { icon: BarChart3, title: "Data-Driven Insights", desc: "Real-time analytics for smarter business decisions." },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div
              className="bg-card rounded-2xl p-8 shadow-elevated border border-border"
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h3 className="text-2xl font-display font-bold text-foreground mb-2">Ready to get started?</h3>
              <p className="text-muted-foreground mb-6">Join thousands of farmers, buyers and creditors already using SMC.</p>
              <Link to="/signup">
                <Button className="w-full min-h-[48px]" size="lg">
                  Create Your Account <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </motion.div>
          </div>
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
};

export default Index;
