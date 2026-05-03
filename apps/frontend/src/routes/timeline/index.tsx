import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  LayoutGrid, 
  Calendar as CalendarIcon, 
  FileText, 
  UserCircle,
  ArrowUp,
  CalendarDays,
  Clock
} from 'lucide-react'

export const Route = createFileRoute('/timeline/')({
  component: TimelinePage,
})

function TimelinePage() {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [eventName, setEventName] = useState('')

  const days = [
    { day: 'M', date: '23', dot: true },
    { day: 'T', date: '24', dot: false },
    { day: 'W', date: '25', dot: true },
    { day: 'T', date: '26', active: true },
    { day: 'F', date: '27', dot: false },
    { day: 'S', date: '28', dot: true },
    { day: 'S', date: '29', dot: true },
  ]

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* --- HEADER & DIALOG --- */}
      <div className="px-6 pt-8 pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Timeline</h1>
          <p className="text-sm text-gray-400">Tuesday, Mar 26</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Plus className="w-6 h-6" />
            </Button>
          </DialogTrigger>
          <DialogContent 
            className="fixed top-6 right-6 left-auto translate-x-0 translate-y-0 sm:max-w-[320px] w-[85vw] border-none shadow-none p-0 bg-transparent focus:outline-none"
          >
            <div className="bg-white rounded-3xl p-4 space-y-4 shadow-2xl border border-gray-100">
              <Input
                placeholder="Event name..."
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="border-none text-base focus-visible:ring-0 px-1 placeholder:text-gray-300 shadow-none h-auto"
              />
              
              <div className="flex items-center justify-between pt-1">
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="h-7 px-2 text-[10px] gap-1 bg-gray-100 rounded-md border-none text-gray-600">
                    <Clock className="w-3.5 h-3.5" /> Date
                  </Button>
                  <Button variant="secondary" size="sm" className="h-7 px-2 text-[10px] gap-1 bg-gray-100 rounded-md border-none text-gray-600">
                    <CalendarDays className="w-3.5 h-3.5" /> Calendar
                  </Button>
                </div>
            
                <Button 
                  size="icon" 
                  className="h-8 w-8 rounded-full bg-black hover:bg-gray-800 transition-transform active:scale-90"
                  onClick={() => {
                    setIsAddOpen(false)
                    setEventName('')
                  }}
                >
                  <ArrowUp className="w-4 h-4 text-white" />
                </Button>
              </div>
            </div>
                
            {/* The Selector Tooltip - Adjusted for smaller width */}
            <div className="absolute -bottom-20 right-0 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden min-w-[80px]">
              <div className="px-4 py-2 text-xs font-bold border-b border-gray-50 bg-gray-50/50 text-gray-900">Event</div>
              <div className="px-4 py-2 text-xs font-medium text-gray-400 hover:bg-gray-50 cursor-pointer transition-colors">Task</div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* --- CALENDAR STRIP --- */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4 px-2">
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-gray-50 border-none">
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          </Button>
          <span className="font-bold text-sm">Mar 2026</span>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-gray-50 border-none">
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Button>
        </div>

        <div className="flex justify-between gap-1">
          {days.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <span className="text-xs font-semibold text-gray-400">{d.day}</span>
              <div className={`
                w-10 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 border
                ${d.active ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-200' : 'bg-white border-gray-100 text-gray-900'}
              `}>
                <span className="font-bold">{d.date}</span>
                {d.dot && !d.active && <div className="w-1 h-1 rounded-full bg-red-500" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- LEGEND --- */}
      <div className="px-4 flex gap-2 overflow-x-auto no-scrollbar mb-8">
        <LegendBadge color="bg-red-500" label="Deadline" />
        <LegendBadge color="bg-orange-400" label="Tasks" />
        <LegendBadge color="bg-green-500" label="Events" />
        <LegendBadge color="bg-blue-500" label="Calendar" />
      </div>

      {/* --- TIMELINE CONTENT --- */}
      <div className="px-4 space-y-6">
        {/* Single Event */}
        <div className="flex gap-4">
          <span className="text-[10px] font-bold text-gray-300 w-12 pt-2">10:30 AM</span>
          <div className="flex-1 relative pl-4 border-l-4 border-green-500 rounded-sm py-1">
            <Card className="border-gray-100 shadow-sm rounded-2xl">
              <CardContent className="p-4">
                <p className="font-bold text-sm">Call mom</p>
                <p className="text-[10px] text-gray-400">10:30 AM · 15m</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Task with Duration Block */}
        <div className="flex gap-4">
          <div className="flex flex-col justify-between py-2">
            <span className="text-[10px] font-bold text-gray-300 w-12">10:30 AM</span>
            <span className="text-[10px] font-bold text-gray-300 w-12">4:15 PM</span>
          </div>
          <div className="flex-1 space-y-3">
             <Card className="border-gray-100 shadow-sm rounded-2xl">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-50 p-1.5 rounded-lg">
                    <Users className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Task...</p>
                    <p className="text-[10px] text-gray-400">9:30 AM · 1h</p>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full border-2 border-gray-200" />
              </CardContent>
            </Card>

            <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-px bg-gray-300 relative mx-1">
                   <div className="absolute -top-1 -left-[1.5px] w-1 h-1 rounded-full bg-gray-400" />
                   <div className="absolute -bottom-1 -left-[1.5px] w-1 h-1 rounded-full bg-gray-400" />
                </div>
                <span className="text-xs font-bold text-gray-400">8h <span className="font-normal ml-2">→ No plans</span></span>
              </div>
              <Plus className="w-4 h-4 text-gray-300" />
            </div>
          </div>
        </div>
      </div>

      
    </div>
  )
}

// Sub-components
function LegendBadge({ color, label }: { color: string, label: string }) {
  return (
    <Badge variant="secondary" className="bg-gray-50 text-gray-500 border-none px-3 py-1 flex gap-2 items-center rounded-full whitespace-nowrap font-medium text-[10px]">
      <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
      {label}
    </Badge>
  )
}

function NavIcon({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-gray-900' : 'text-gray-300'}`}>
      <div className="w-6 h-6">{icon}</div>
      <span className="text-[10px] font-bold">{label}</span>
    </div>
  )
}