# CateringOS (Internal Code: Flow-OS)

**A production-ready, multi-tenant SaaS platform designed to modernize operations for independent catering businesses.**

[![Status](https://img.shields.io/badge/status-production_active-success)]()
[![Stack](https://img.shields.io/badge/stack-React_|_Supabase-blue)]()

## About The Project

CateringOS is a vertical SaaS product built to solve the fragmented workflow of local caterers. Most independent caterers currently rely on a mix of spreadsheets, paper notebooks, and generic tools like DocuSign to run their business. This leads to lost leads, miscalculated invoices, and administrative chaos.

This platform consolidates their entire operation—from lead capture to final payment—into a single, mobile-responsive "operating system."

It is currently being piloted by local businesses (e.g., Las Cazuelas Catering) to manage real-world events and contracts.

### Key Features

* **AUTOMATED PIPELINE:** A Trello-style Kanban board customized for the catering workflow (Lead → Tasting → Proposal → Booked). Dragging a client automatically updates their status across the system.
* **SMART INVOICING:** Auto-calculates totals based on guest counts and selected menu items, eliminating manual math errors.
* **INTEGRATED E-SIGNATURES:** Clients can sign proposals digitally on mobile or desktop. The system captures IP addresses and timestamps for a legally defensible audit trail, automatically converting leads to "Booked" status upon signature.
* **MOBILE-FIRST DESIGN:** Built for field usage, allowing caterers to pull up contracts, client details, and schedules while working an event.

---

## Product Overview

### The Command Center
A unified dashboard giving business owners an immediate view of upcoming events, recent activity, and financial performance.

![Financial Overview & Recent Activity](./screenshots/image_ede925.jpg)
*Above: The financial overview cards and recent activity feed.*

### Lead Pipeline & Management
Replacing messy notebooks with a clear visual status of every potential client.

![Sales Pipeline Kanban](./screenshots/image_ede5c7.jpg)
*Above: The drag-and-drop pipeline moving clients from initial Lead to Booked.*

### Client & Menu Configuration
Managing specific event details, menu selections, and pricing in one secure location.

![Client Details and Menu](./screenshots/image_ede603.jpg)
*Above: Detailed client view including menu configurations.*

---

## Technical Highlights & Engineering

This is not just a UI wrapper; it is a secure, multi-tenant architecture handling sensitive business data.

### 🔐 Multi-Tenancy Security (Row Level Security)
Built on **Supabase (PostgreSQL)**, the application uses strict **Row Level Security (RLS)** policies. This ensures complete data isolation between different catering companies using the platform. A vendor can only ever access data associated with their specific `organization_id`, preventing critical data breaches between competitors.

### ✍️ E-Signature Implementation
Instead of relying on expensive third-party APIs like DocuSign, I implemented a custom e-signature solution. It captures signature data along with necessary legal metadata (timestamp and IP origin), providing clients with a secure, integrated signing experience without leaving the app.

### 🏗️ Tech Stack

* **Frontend:** React.js, Vite
* **Backend-as-a-Service:** Supabase (Auth, Database, Storage)
* **Styling:** Tailwind CSS (inferred from UI)
* **Deployment:** Vercel

## Contact

Project Link: [https://github.com/nellinger96/flow-os](https://github.com/nellinger96/flow-os)
