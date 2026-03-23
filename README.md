



### Frontend (React/Next.js)
```
frontend/
├── app/
```

### Backend (Node.js/Express + PostgreSQL)
```
backend/
├── src/
```









```sql
Users: { id, email, username, password, fullName, role, annualLeaveBalance }

Sites: { id, name, location, supervisorId }

LeaveRequests: { id, startDate, endDate, leaveType, status, documentUrl }

LeaveReviews: { id, leaveRequestId, reviewerId, comment, status }

AuditLogs: { id, userId, action, timestamp }
```


- Node.js >= 16
- PostgreSQL


```bash
cd backend

npm install

cp .env.example .env

npm run prisma:migrate

npm run dev
```


```bash
cd frontend

npm install

cp .env.local.example .env.local

npm run dev
```


## 📡 API Endpoints

```
```

```
```









