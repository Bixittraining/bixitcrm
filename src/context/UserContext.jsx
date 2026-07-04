import { createContext, useContext, useState, useEffect } from 'react'

const UserContext = createContext()

const defaultProfile = { name: 'Yogesh', email: 'socialmmin@gmail.com', phone: '+91 98765 43210', role: 'Administrator' }

export function UserProvider({ children }) {
  const [profile, setProfile] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('bix_profile'))
      return saved ? { ...defaultProfile, ...saved } : defaultProfile
    } catch {
      return defaultProfile
    }
  })

  useEffect(() => {
    localStorage.setItem('bix_profile', JSON.stringify(profile))
  }, [profile])

  const initials = profile.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <UserContext.Provider value={{ profile, setProfile, initials }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
