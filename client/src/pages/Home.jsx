import { useState } from 'react'
import Icon from '../components/Icon'

const FEATURES = [
  {
    icon: 'dashboard',
    title: 'Live Dashboard',
    text: 'See income, expenses and savings at a glance, updated in real time the moment you record a transaction.'
  },
  {
    icon: 'customers',
    title: 'Customer Directory',
    text: 'Keep every customer, phone number and birthday in one place — with automated birthday celebration built in.'
  },
  {
    icon: 'payments',
    title: 'Payments & Income',
    text: 'Record every payment with notes and dates. Positive cash flow is tracked automatically for your reports.'
  },
  {
    icon: 'expenses',
    title: 'Expense Tracking',
    text: 'Log your spending in seconds. Every naira out is captured, categorised and reflected in your cash flow.'
  },
  {
    icon: 'savings',
    title: 'Savings Pot',
    text: 'Track regular savings against the balance your business needs to grow — with a weekly reminder so you never miss a deposit.'
  },
  {
    icon: 'reports',
    title: 'Reports & Statements',
    text: 'Generate snapshot reports and download a professional PDF bank statement for any month in one click.'
  },
  {
    icon: 'messages',
    title: 'Messaging Templates',
    text: 'Beautiful, ready-made email and SMS templates for statements, birthdays and reminders — fully customisable.'
  },
  {
    icon: 'notification',
    title: 'Automated Notifications',
    text: 'Monthly financial statements, birthday messages and Friday savings reminders are sent automatically — no chasing.'
  },
  {
    icon: 'settings',
    title: 'Custom Settings',
    text: 'Your business name, brand, statement schedule, timezone and sending account — all configured in seconds.'
  }
]

const STEPS = [
  {
    n: '01',
    title: 'Sign up free',
    text: 'Create your account and set your business name, brand and statement email. No card needed.'
  },
  {
    n: '02',
    title: 'Record daily',
    text: 'Log payments, expenses and savings as they happen. Your dashboard updates itself instantly.'
  },
  {
    n: '03',
    title: 'We do the rest',
    text: 'Monthly statements, birthday greetings and reminders are generated and delivered automatically.'
  }
]

const FAQS = [
  {
    q: 'How much does BizStrives cost?',
    a: 'As a core tool, BizStrives is free to use. You can set up your business, record transactions and download statements without any subscription.'
  },
  {
    q: 'How are statements sent to my customers?',
    a: 'On the last day of each month, a professional PDF statement of every active customer is generated and delivered automatically to your statement email address.'
  },
  {
    q: 'Does BizStrives send to SMS as well as email?',
    a: 'Yes. Templates are built for both channels so you can reach customers however they prefer, for monthly statements, birthday greetings and savings reminders.'
  },
  {
    q: 'Is my financial data secure?',
    a: 'Your account is protected with secure login, and all communication happens over an encrypted connection. Your data belongs to you.'
  },
  {
    q: 'Can I set my own schedule?',
    a: 'Absolutely. Choose your statement day and time, your timezone, and your sending account — BizStrives works around your business rhythm.'
  }
]

function Logo({ dark = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-brand-pink flex items-center justify-center shadow-lift">
        <span className="text-white font-extrabold text-lg leading-none">B</span>
      </div>
      <div className="leading-tight">
        <span className={`font-extrabold text-lg ${dark ? 'text-white' : 'text-brand-text'}`}>BizStrives</span>
        <span className={`block text-[11px] ${dark ? 'text-white/70' : 'text-brand-muted'}`}>Small Business Toolkit</span>
      </div>
    </div>
  )
}

export default function Home() {
  const [open, setOpen] = useState(null)

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text antialiased">
      <header className="sticky top-0 z-40 bg-brand-surface/90 backdrop-blur border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <a href="/"><Logo /></a>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-brand-muted">
            <a href="#features" className="hover:text-brand-pink">Features</a>
            <a href="#how" className="hover:text-brand-pink">How it works</a>
            <a href="#security" className="hover:text-brand-pink">Security</a>
            <a href="#faq" className="hover:text-brand-pink">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="/login" className="hidden sm:inline-flex text-sm font-semibold text-brand-pink hover:text-brand-pinkDark">Sign in</a>
            <a href="/login" className="btn btn-cta !py-2 px-4 text-sm">Get Started</a>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 bg-brand-pinkSoft rounded-full blur-3xl"></div>
        <div className="pointer-events-none absolute top-40 -left-32 w-80 h-80 bg-brand-pink/10 rounded-full blur-3xl"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-20 lg:pt-24 lg:pb-28 grid lg:grid-cols-2 gap-14 items-center relative">
          <div>
            <span className="inline-flex items-center gap-2 bg-brand-pinkSoft text-brand-pinkDark text-xs font-semibold px-3 py-1.5 rounded-full">
              <Icon name="savings" size={14} />
              Your small business, running itself
            </span>
            <h1 className="mt-6 text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight">
              Track, save and{' '}
              <span className="text-brand-pink">report</span> like the big banks.
            </h1>
            <p className="mt-5 text-lg text-brand-muted max-w-xl">
              BizStrives puts income, expenses, savings and customer communication in one place — with automated monthly statements and birthday greetings sent to your customers without you lifting a finger.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href="/login" className="btn btn-cta !py-3 px-7 text-base shadow-lift">Create Free Account</a>
              <a href="#features" className="btn btn-secondary !py-3 px-7 text-base">Explore Features</a>
            </div>
            <p className="mt-4 text-sm text-brand-muted">Free to use · No card required · Set up in under a minute</p>
          </div>

          <div className="relative">
            <div className="card p-6 sm:p-8 !shadow-2xl relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs font-semibold text-brand-muted uppercase tracking-wide">Welcome back</p>
                  <p className="text-xl font-bold mt-0.5">Ada's Grocery 🛒</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-brand-muted">This month</p>
                  <p className="text-xl font-extrabold text-brand-lime">₦1,284,500</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-brand-surface2 rounded-xl p-4">
                  <p className="text-xs font-semibold text-brand-muted">Income</p>
                  <p className="text-lg font-bold text-brand-pink mt-1">₦862,000</p>
                  <div className="mt-3 h-1.5 rounded-full bg-brand-pink/20"><div className="h-1.5 rounded-full bg-brand-pink w-3/4"></div></div>
                </div>
                <div className="bg-brand-surface2 rounded-xl p-4">
                  <p className="text-xs font-semibold text-brand-muted">Expenses</p>
                  <p className="text-lg font-bold text-red-600 mt-1">₦518,500</p>
                  <div className="mt-3 h-1.5 rounded-full bg-red-100"><div className="h-1.5 rounded-full bg-red-500 w-1/2"></div></div>
                </div>
              </div>
              <div className="mt-4 bg-brand-surface2 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-brand-muted">Savings pot</p>
                  <p className="text-lg font-bold mt-0.5">₦344,000 <span className="text-xs text-brand-lime font-semibold">saved this month</span></p>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-brand-pinkSoft text-brand-pinkDark">On track ✓</span>
              </div>
              <div className="mt-4 space-y-2.5">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-brand-pinkSoft text-brand-pink flex items-center justify-center"><Icon name="notification" size={16} /></span>
                  <p className="text-sm text-brand-muted">Birthday message sent to Chidi — automatically 🎉</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-brand-lime text-white flex items-center justify-center"><Icon name="reports" size={16} /></span>
                  <p className="text-sm text-brand-muted">June PDF statement downloaded</p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-brand-pinkSoft rounded-2xl blur-3xl -z-10"></div>
          </div>
        </div>
      </section>

      <section className="border-y border-brand-border bg-brand-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {[
            ['9', 'tools in one business app'],
            ['Monthly', 'PDF statements, automatic'],
            ['Birthday', 'greetings sent for you'],
            ['Email + SMS', 'both delivery channels']
          ].map(([num, label]) => (
            <div key={num}>
              <p className="text-3xl font-extrabold text-brand-pink">{num}</p>
              <p className="mt-1 text-sm text-brand-muted">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-20 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold text-brand-pink uppercase tracking-widest">Features</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold">Everything your business needs, in one dashboard</h2>
          <p className="mt-4 text-brand-muted">Nine focused tools — every one of them already live in your account today.</p>
        </div>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="card p-6 group hover:!shadow-lift transition-shadow duration-200">
              <div className="w-11 h-11 rounded-xl bg-brand-pinkSoft text-brand-pink flex items-center justify-center group-hover:bg-brand-pink group-hover:text-white transition-colors">
                <Icon name={f.icon} size={22} />
              </div>
              <h3 className="mt-4 font-bold text-lg">{f.title}</h3>
              <p className="mt-2 text-sm text-brand-muted leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="bg-brand-surface border-y border-brand-border scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold text-brand-pink uppercase tracking-widest">How it works</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold">Up and running in three simple steps</h2>
          </div>
          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {STEPS.map(s => (
              <div key={s.n} className="relative">
                <span className="text-5xl font-extrabold text-brand-pinkSoft">{s.n}</span>
                <h3 className="mt-3 font-bold text-lg">{s.title}</h3>
                <p className="mt-2 text-sm text-brand-muted leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="max-w-7xl mx-auto px-4 sm:px-6 py-20 scroll-mt-20">
        <div className="card p-8 sm:p-12 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-xs font-bold text-brand-pink uppercase tracking-widest">Security</span>
            <h2 className="mt-3 text-3xl font-extrabold">Your money data, protected</h2>
            <p className="mt-4 text-brand-muted leading-relaxed">
              Sign in securely and be confident knowing your records travel over an encrypted connection and stay private to you. Statements are generated from your own numbers — nothing more, nothing less.
            </p>
            <ul className="mt-6 space-y-3">
              {['Secure account login', 'Encrypted communication', 'Your data belongs to you', 'Statements built from your own records'].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm font-medium">
                  <span className="w-5 h-5 rounded-full bg-brand-lime text-white flex items-center justify-center"><Icon name="savings" size={12} /></span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-brand-surface2 rounded-2xl p-6 sm:p-8">
            <div className="border border-brand-border bg-brand-surface rounded-xl p-4 flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-brand-pink text-white flex items-center justify-center"><Icon name="customers" size={18} /></span>
              <div>
                <p className="font-semibold text-sm">Secure access</p>
                <p className="text-xs text-brand-muted">bizstrives login verified</p>
              </div>
            </div>
            <div className="mt-4 border border-brand-border bg-brand-surface rounded-xl p-4 flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-brand-lime text-white flex items-center justify-center"><Icon name="reports" size={18} /></span>
              <div>
                <p className="font-semibold text-sm">Encrypted connection</p>
                <p className="text-xs text-brand-muted">HTTPS everywhere</p>
              </div>
            </div>
            <div className="mt-4 border border-brand-border bg-brand-surface rounded-xl p-4 flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-brand-pinkSoft text-brand-pink flex items-center justify-center"><Icon name="settings" size={18} /></span>
              <div>
                <p className="font-semibold text-sm">You stay in control</p>
                <p className="text-xs text-brand-muted">Only you ever see your numbers</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="bg-brand-surface border-t border-brand-border scroll-mt-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
          <div className="text-center">
            <span className="text-xs font-bold text-brand-pink uppercase tracking-widest">FAQ</span>
            <h2 className="mt-3 text-3xl font-extrabold">Questions, answered</h2>
          </div>
          <div className="mt-10 space-y-3">
            {FAQS.map((fq, i) => (
              <div key={fq.q} className="card overflow-hidden">
                <button onClick={() => setOpen(open === i ? null : i)} className="w-full px-5 py-4 flex items-center justify-between text-left font-semibold">
                  {fq.q}
                  <span className={`text-brand-pink transition-transform ${open === i ? 'rotate-45' : ''}`}>＋</span>
                </button>
                {open === i && <p className="px-5 pb-5 text-sm text-brand-muted leading-relaxed">{fq.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="bg-brand-pink rounded-3xl p-8 sm:p-14 text-center text-white relative overflow-hidden">
          <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-2xl"></div>
          <div className="pointer-events-none absolute -bottom-20 -left-10 w-72 h-72 bg-white/10 rounded-full blur-2xl"></div>
          <h2 className="text-3xl sm:text-4xl font-extrabold relative">Your statements, on autopilot.</h2>
          <p className="mt-3 text-white/80 max-w-xl mx-auto relative">
            Join a growing number of small businesses using BizStrives to keep books clean and customers smiling.
          </p>
          <div className="mt-8 relative">
            <a href="/login" className="inline-block bg-white text-brand-pink font-bold px-8 py-3.5 rounded-lg hover:bg-brand-pinkSoft transition-colors">Get Started Free</a>
          </div>
        </div>
      </section>

      <footer className="border-t border-brand-border bg-brand-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo />
          <p className="text-sm text-brand-muted text-center">Small businesses don't need big banks. They need BizStrives.</p>
          <a href="/dashboard" className="text-sm font-semibold text-brand-pink hover:text-brand-pinkDark">Go to dashboard →</a>
        </div>
        <div className="border-t border-brand-border py-5 text-center text-xs text-brand-muted">
          © {new Date().getFullYear()} BizStrives. All rights reserved.
        </div>
      </footer>
    </div>
  )
}