import { redirect } from 'next/navigation'

export default function Home() {
  // If we had the auth context active right now we'd check it here. 
  // For the MVP, we just aggressively redirect them into the dashboard.
  redirect('/dashboard')
}
