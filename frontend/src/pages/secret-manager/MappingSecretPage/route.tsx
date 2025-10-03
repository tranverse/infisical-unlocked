import {
  createFileRoute,
  linkOptions,
  stripSearchParams,
} from '@tanstack/react-router'
import { MappingSecretPage } from './MappingSecretPage'

export const Route = createFileRoute(
  '/_authenticate/_inject-org-details/_org-layout/projects/secret-management/$projectId/_secret-manager-layout/mapping-secrets/$mappingId',
)({
  component: MappingSecretPage,
})
