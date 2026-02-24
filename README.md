# Praxis SaaS

Praxis is a comprehensive SaaS platform built to help candidates navigate modern interviewing, coding practice, and technical preparation.

## 🚀 Tech Stack

### Frontend
* **Framework:** [Next.js](https://nextjs.org/) (React)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **Language:** TypeScript

### Backend
* **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Python)
* **Database Management:** [SQLAlchemy](https://www.sqlalchemy.org/)
* **Backend-as-a-Service / DB:** [Supabase](https://supabase.com/) (PostgreSQL)
* **AI Integration:** Google Gemini (`google-genai`)

---

## 🛠️ Getting Started

### Prerequisites
* **Node.js:** v18 or later
* **Python:** 3.10 or later
* **PostgreSQL Database:** Supabase account/project
* **Google Gemini API Key**

### 1. Frontend Setup
Navigate to the `frontend` directory:
```bash
cd frontend
```

Install the dependencies:
```bash
npm install
```

Set up your environment variables by creating a `.env.local` file (use `.env.example` if available as a reference):
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Run the development server:
```bash
npm run dev
```
The frontend should now be running on [http://localhost:3000](http://localhost:3000).

### 2. Backend Setup
Navigate to the `backend` directory:
```bash
cd backend
```

Create and activate a virtual environment:
```bash
# On macOS/Linux
python -m venv venv
source venv/bin/activate

# On Windows
python -m venv venv
.\venv\Scripts\activate
```

Install the required Python packages:
```bash
pip install -r requirements.txt
```

Set up the backend environment variables by creating a `.env` file:
```env
# Example environment variables
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_key
```

Start the FastAPI server:
```bash
uvicorn app.main:app --reload
```
The backend API should now be running on [http://localhost:8000](http://localhost:8000). You can visit `http://localhost:8000/docs` to view the automatic Swagger UI documentation.
