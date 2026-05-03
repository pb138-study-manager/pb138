import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/courses/new')({
  component: NewCoursePage,
})

function NewCoursePage() {
  const navigate = useNavigate()

  const [code, setCode] = useState('')
  const [name, setName] = useState('')

  const handleBack = () => {
    navigate({ to: '/courses' })
  }

  const handleCreate = () => {
    // later: send to backend
    console.log({ code, name })

    // go back after creating
    navigate({ to: '/courses' })
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="p-0 h-auto w-auto"
        >
          <ChevronLeft className="w-6 h-6 text-gray-900" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">New Course</h1>
      </div>

      {/* Form */}
      <div className="px-4 py-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Course Code
          </label>
          <Input
            placeholder="e.g. PB138"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Course Name
          </label>
          <Input
            placeholder="Full name of the course"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <Button
          onClick={handleCreate}
          className="w-full mt-4"
        >
          Create Course
        </Button>
      </div>
    </div>
  )
}