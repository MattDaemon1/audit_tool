'use client'

import { useState } from 'react'

export default function Home() {
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const validateDomain = (url: string) => {
    const regex = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}$/
    return regex.test(url)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateDomain(domain)) {
      setError("Domaine invalide (ex: exemple.com)")
      return
    }

    setLoading(true)

    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      alert('Test réussi !')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-6">Audit Express de site web</h1>
        <div className="max-w-md mx-auto">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Entrez le domaine à auditer</h2>
            <div className="mb-4">
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="ex: exemple.com"
                className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            {loading && <p className="text-blue-500 mb-4">Test en cours...</p>}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 text-white font-semibold rounded ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {loading ? 'Test...' : 'Tester'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
