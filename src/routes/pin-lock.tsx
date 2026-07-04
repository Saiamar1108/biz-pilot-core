import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/pin-lock')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/pin-lock"!</div>
}
