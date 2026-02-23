import { redirect } from 'next/navigation';

export default function Home() {
  // Langsung arahkan (tendang) user ke dashboard admin
  redirect('/admin/dashboard');
}