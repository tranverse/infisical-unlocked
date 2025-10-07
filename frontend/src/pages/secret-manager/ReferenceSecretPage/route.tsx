import { createFileRoute } from '@tanstack/react-router'
import { ReferenceSecretPage } from './ReferenceSecretPage'

export const Route = createFileRoute(
  '/_authenticate/_inject-org-details/_org-layout/projects/secret-management/$projectId/_secret-manager-layout/reference-secrets/',
)({
  component: ReferenceSecretPage,
})
