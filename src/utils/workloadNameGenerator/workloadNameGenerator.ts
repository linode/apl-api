import firstnames from './firstnames.json'
import lastnames from './lastnames.json'

export function workloadNameGenerator() {
  const randomFirstnameIndex = Math.floor(Math.random() * firstnames.length)
  const firstname = firstnames[randomFirstnameIndex]

  const randomLastnameIndex = Math.floor(Math.random() * lastnames.length)
  const lastname = lastnames[randomLastnameIndex]

  return `${firstname}-${lastname}`
}
