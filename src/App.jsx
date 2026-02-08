import { Routes, Route } from 'react-router-dom'
import Layout from './pages/Layout'
import { Toaster } from 'react-hot-toast'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import Team from './pages/Team'
import ProjectDetails from './pages/ProjectDetails'
import TaskDetails from './pages/TaskDetails'
import Settings from './pages/Settings'
import Groups from './pages/Groups'
import Attendance from './pages/Attendance'
import EmailMonitor from './pages/EmailMonitor'

const App = () => {
    return (
        <>
            <Toaster />
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="team" element={<Team />} />
                    <Route path="projects" element={<Projects />} />
                    <Route path="groups" element={<Groups />} />
                    <Route path="attendance" element={<Attendance />} />
                    <Route path="email-monitor" element={<EmailMonitor />} />
                    <Route path="projectsDetail" element={<ProjectDetails />} />
                    <Route path='taskDetails' element={<TaskDetails/>} />
                    <Route path='settings' element={<Settings/>} />
                </Route>
            </Routes>
        </>
    )
}

export default App