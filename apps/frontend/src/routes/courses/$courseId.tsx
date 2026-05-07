import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  ChevronLeft, 
  Plus, 
  CheckSquare, 
  Folder, 
  Users, 
  Clock, 
  LayoutGrid, 
  Calendar, 
  FileText, 
  UserCircle,
  ChevronDown
} from 'lucide-react'

export const Route = createFileRoute('/courses/$courseId')({
  component: CourseDetailPage,
})

function CourseDetailPage() {
  const { courseId } = useParams({ from: '/courses/$courseId' })
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-4 py-6 space-y-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate({ to: '/courses' })}
            className="h-8 w-8"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold leading-tight">CODE123</h1>
            <p className="text-xs text-gray-500 uppercase tracking-wide">full name of the course</p>
          </div>
        </div>

        {/* Mentor Section */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-full bg-gray-200" />
          <span className="font-medium text-sm text-gray-700">Mentor's name</span>
        </div>
      </div>

      <div className="flex-1 px-4 space-y-8 pb-32">
        {/* Tasks Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-green-100 p-1 rounded">
                <CheckSquare className="w-4 h-4 text-green-600" />
              </div>
              <h2 className="font-bold text-gray-900">Tasks</h2>
              <span className="text-gray-400 font-normal">4</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
            <Plus className="w-5 h-5 text-gray-900 cursor-pointer" />
          </div>

          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="rounded-2xl border-gray-100 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Task...</p>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>Due 23:59 · Subject</span>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 border-gray-200" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Notes Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Folder className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <h2 className="font-bold text-gray-900">Notes</h2>
              <span className="text-gray-400 font-normal">4</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
            <Plus className="w-5 h-5 text-gray-900 cursor-pointer" />
          </div>

          <div className="space-y-3">
            <Card className="rounded-2xl border-gray-100 shadow-sm">
              <CardContent className="p-4 font-medium">Nice</CardContent>
            </Card>
            
            <Card className="rounded-2xl border-gray-100 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Folder className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium">Hello</span>
                </div>
                <Users className="w-4 h-4 text-blue-500" />
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-gray-100 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <span className="font-medium">Nice</span>
                <Users className="w-4 h-4 text-blue-500" />
              </CardContent>
            </Card>
          </div>
        </section>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <NavIcon icon={<LayoutGrid />} label="Tasks" />
          <NavIcon icon={<Calendar />} label="Today" />
          <NavIcon icon={<FileText />} label="Notes" active />
          <NavIcon icon={<UserCircle />} label="Profile" />
        </div>
      </div>
    </div>
  )
}

function NavIcon({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-1 cursor-pointer ${active ? 'text-gray-900' : 'text-gray-400'}`}>
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </div>
  )
}