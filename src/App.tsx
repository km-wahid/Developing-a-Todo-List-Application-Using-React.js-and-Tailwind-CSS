import React, { useState } from 'react'
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  ListTodo,
  CheckCheck,
  Calendar,
} from 'lucide-react'

// Define the Task interface
export interface Task {
  id: string
  title: string
  completed: boolean
  createdAt: string
}

export default function App() {
  // Requirement: Use React's useState hook to manage tasks
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Set up React.js project using Vite',
      completed: true,
      createdAt: 'Today',
    },
    {
      id: '2',
      title: 'Install and configure Tailwind CSS for styling',
      completed: true,
      createdAt: 'Today',
    },
    {
      id: '3',
      title: 'Build the interactive Todo List application',
      completed: false,
      createdAt: 'Today',
    },
  ])

  // State to hold the new task input
  const [newTaskTitle, setNewTaskTitle] = useState('')
  // State to control filter view (All, Active, Completed)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')

  // Requirement: Create a function to add new tasks to the list
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedTitle = newTaskTitle.trim()
    if (!trimmedTitle) return

    const newTask: Task = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      title: trimmedTitle,
      completed: false,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setTasks((prevTasks) => [newTask, ...prevTasks])
    setNewTaskTitle('')
  }

  // Requirement: Implement functionality to mark tasks as completed or incomplete
  const handleToggleTask = (id: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task,
      ),
    )
  }

  // Requirement: Create a function to delete tasks from the list
  const handleDeleteTask = (id: string) => {
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id))
  }

  // Function to clear all completed tasks
  const handleClearCompleted = () => {
    setTasks((prevTasks) => prevTasks.filter((task) => !task.completed))
  }

  // Requirement: Display the number of remaining tasks
  const remainingCount = tasks.filter((task) => !task.completed).length
  const completedCount = tasks.filter((task) => task.completed).length

  // Filter tasks based on selected tab
  const filteredTasks = tasks.filter((task) => {
    if (filter === 'active') return !task.completed
    if (filter === 'completed') return task.completed
    return true
  })

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/30 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        {/* Header Section */}
        <header className="mb-8 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 mb-3">
            <ListTodo className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Todo List
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Organize your day with React &amp; Tailwind CSS
          </p>
        </header>

        {/* Main Card */}
        <section className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
          {/* Add Task Form */}
          <form
            onSubmit={handleAddTask}
            className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50"
            data-testid="add-task-form"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="What needs to be done?"
                aria-label="New task title"
                data-testid="task-input"
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
              />
              <button
                type="submit"
                disabled={!newTaskTitle.trim()}
                data-testid="add-task-button"
                className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-200 cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Add Task</span>
              </button>
            </div>
          </form>

          {/* Filter Bar & Remaining Count summary */}
          <div className="px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-sm">
            {/* Requirement: Display the number of remaining tasks */}
            <div
              className="font-medium text-slate-600"
              data-testid="remaining-count"
            >
              <span className="font-bold text-indigo-600">{remainingCount}</span>{' '}
              {remainingCount === 1 ? 'task' : 'tasks'} remaining
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setFilter('all')}
                data-testid="filter-all"
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  filter === 'all'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({tasks.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('active')}
                data-testid="filter-active"
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  filter === 'active'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active ({remainingCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter('completed')}
                data-testid="filter-completed"
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  filter === 'completed'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Completed ({completedCount})
              </button>
            </div>
          </div>

          {/* Task List */}
          <div className="divide-y divide-slate-100 min-h-[160px]">
            {filteredTasks.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-3">
                  <CheckCheck className="w-6 h-6" />
                </div>
                <p className="text-slate-600 font-medium">No tasks found</p>
                <p className="text-xs text-slate-400 mt-1">
                  {filter === 'completed'
                    ? 'You have not completed any tasks yet.'
                    : filter === 'active'
                    ? 'No active tasks! You are all caught up.'
                    : 'Add a new task using the input above to get started.'}
                </p>
              </div>
            ) : (
              /* Requirement: Display all tasks dynamically using the map() method */
              <ul className="divide-y divide-slate-100" data-testid="task-list">
                {filteredTasks.map((task) => (
                  <li
                    key={task.id}
                    data-testid={`task-item-${task.id}`}
                    className={`flex items-center justify-between p-4 sm:px-6 hover:bg-slate-50/70 transition-colors group ${
                      task.completed ? 'bg-slate-50/30' : ''
                    }`}
                  >
                    {/* Requirement: Implement functionality to mark tasks as completed or incomplete */}
                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                      <button
                        type="button"
                        onClick={() => handleToggleTask(task.id)}
                        data-testid={`toggle-task-${task.id}`}
                        aria-label={
                          task.completed
                            ? `Mark "${task.title}" as incomplete`
                            : `Mark "${task.title}" as complete`
                        }
                        className="text-slate-400 hover:text-indigo-600 focus:outline-none transition-colors cursor-pointer"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" />
                        )}
                      </button>

                      <div className="flex flex-col min-w-0">
                        <span
                          className={`text-sm font-medium truncate transition-all ${
                            task.completed
                              ? 'line-through text-slate-400'
                              : 'text-slate-800'
                          }`}
                        >
                          {task.title}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {task.createdAt}
                        </span>
                      </div>
                    </div>

                    {/* Requirement: Create a function to delete tasks from the list */}
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task.id)}
                      data-testid={`delete-task-${task.id}`}
                      aria-label={`Delete "${task.title}"`}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer opacity-80 sm:opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer Controls */}
          {tasks.length > 0 && (
            <footer className="p-4 sm:px-6 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Total tasks: {tasks.length}</span>
              {completedCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearCompleted}
                  data-testid="clear-completed-button"
                  className="font-medium text-rose-600 hover:text-rose-700 hover:underline transition-colors cursor-pointer"
                >
                  Clear completed ({completedCount})
                </button>
              )}
            </footer>
          )}
        </section>

      </div>
    </main>
  )
}
