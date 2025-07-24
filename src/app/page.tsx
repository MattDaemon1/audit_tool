import DomainForm from '@/components/DomainForm'

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-6">Audit Express de site web</h1>
        <DomainForm />
      </div>
    </main>
  )
}
