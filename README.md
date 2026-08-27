# TodoMint

A modern fullstack task management application designed to boost productivity with daily scheduling, a 24 hour visual timeline, and clear organization.

---

## 📸 Screenshots 
![TodoMint Dashboard](./src/assets/non-reachable/Animation.gif)

---

## 🚀 Features
* **Daily Task Management:** Quickly add, edit, mark important, and mark as completed.
* **24 Hour Task Timeline:** Visual curve representing daily task distribution throughout the day.
* **Interactive calendar:** Monthly overview to check scheduled tasks.
* **Custom Lists:** Separate tasks into custom categories or view by status (All, Today, Important, Completed).
* **Responsive Layout:** Clean dashboard layout with light/dark theme toggles and quick access navigation.

---

## 🛠️ Tech Stack
* **Frontend:** HTML5, Tailwind CSS, JavaScript
* **Backend:** Node.js, Express.js
* **Database:** SQLite / Turso

---

## 📁 Project Structure
```text
todomint/
├── controllers/
├── middleware/
├── routes/
├── schemas/
├── services/
├── src/
│   ├── assets/
│   ├── components/
│   └── fonts/
├── tests/
├── .env.example
├── .gitignore
├── index.js
├── LICENSE
├── package-lock.json
├── package.json
├── README.md
└── vercel.json
```

---

## 💻 Getting Started

### Prerequisites
Make sure you have Node.js and npm installed on your system:
* [Node.js](https://nodejs.org/) (v18.0.0 or higher)
* npm

### Installation & Local Setup
1. **Clone the repository:**
   ```bash
    git clone https://github.com/karkemo/todomint.git
    cd todomint
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   TURSO_DATABASE_URL=your_turso_db_url
   TURSO_AUTH_TOKEN=your_turso_auth_token
   ```

4. **Run the application:**
   * Development mode:
     ```bash
     npm run dev
     ```
   * Production mode:
     ```bash
     npm start
     ```

5. **Access the Application:**
   Open your browser and navigate to `http://localhost:3000`.

---

## 📜 License
This project is open-source and licensed under the [GPL-3.0](LICENSE) License.