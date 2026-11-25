function identity(connection) {
  try {
    const url = new URL(connection)
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error()
    return `${url.hostname.toLowerCase().replace('-pooler.', '.')}:${url.port || '5432'}${url.pathname}`
  } catch { throw new Error('Conexão de teste PostgreSQL inválida. Revise TEST_DATABASE_URL sem expor seu conteúdo.') }
}
export function testDatabaseConnection(testConnection, applicationConnections) {
  if (!testConnection) throw new Error('Configure TEST_DATABASE_URL com um banco/branch exclusivo de desenvolvimento. O teste não usará DATABASE_URL como alternativa.')
  const target = identity(testConnection)
  if (!applicationConnections.filter(Boolean).length) throw new Error('Informe também DATABASE_URL para conferir que o destino de teste é diferente da aplicação.')
  if (applicationConnections.filter(Boolean).some(connection => identity(connection) === target)) throw new Error('Integração bloqueada: o banco de teste é o mesmo da aplicação, incluindo a conexão pooled/direta.')
  return testConnection
}
