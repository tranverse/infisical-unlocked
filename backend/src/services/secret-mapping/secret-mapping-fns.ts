export const fnSecretBulkUpdate = async ({
  tx,
  inputSecrets,
  folderId,
  commitChanges,
  orgId,
  secretDAL,
  secretVersionDAL,
  folderCommitService,
  secretTagDAL,
  secretVersionTagDAL,
  resourceMetadataDAL,
  actor
}: TFnSecretBulkUpdate) => {
  const userActorId = actor && actor?.type === ActorType.USER ? actor?.actorId : undefined;
  const identityActorId = actor && actor?.type === ActorType.IDENTITY ? actor?.actorId : undefined;
  const actorType = actor?.type || ActorType.PLATFORM;

  const sanitizedInputSecrets = inputSecrets.map(
    ({
      filter,
      data: { skipMultilineEncoding, type, key, encryptedValue, userId, encryptedComment, metadata, secretMetadata, mappingId }
    }) => ({
      filter: { ...filter, folderId },
      data: {
        skipMultilineEncoding,
        type,
        key,
        userId,
        encryptedComment,
        metadata: JSON.stringify(metadata || secretMetadata || []),
        encryptedValue,
        mappingId
      }
    })
  );

  const newSecrets = await secretDAL.bulkUpdate(sanitizedInputSecrets, tx);
  const secretVersions = await secretVersionDAL.insertMany(
    newSecrets.map(
      ({
        skipMultilineEncoding,
        type,
        key,
        userId,
        encryptedComment,
        version,
        metadata,
        encryptedValue,
        mappingId,
        id: secretId
      }) => ({
        skipMultilineEncoding,
        type,
        key,
        userId,
        encryptedComment,
        version,
        metadata: metadata ? JSON.stringify(metadata) : [],
        encryptedValue,
        folderId,
        secretId,
        userActorId,
        identityActorId,
        actorType,
        mappingId
      })
    ),
    tx
  );

  await secretDAL.upsertSecretReferences(
    inputSecrets
      .filter(({ data: { references } }) => Boolean(references))
      .map(({ data: { references = [] } }, i) => ({
        secretId: newSecrets[i].id,
        references
      })),
    tx
  );
  const secsUpdatedTag = inputSecrets.flatMap(({ data: { tags } }, i) =>
    tags !== undefined ? { tags, secretId: newSecrets[i].id } : []
  );
  if (secsUpdatedTag.length) {
    await secretTagDAL.deleteTagsToSecretV2(
      { $in: { secrets_v2Id: secsUpdatedTag.map(({ secretId }) => secretId) } },
      tx
    );
    const newSecretTags = secsUpdatedTag.flatMap(({ tags: secretTags = [], secretId }) =>
      secretTags.map((tag) => ({
        [`${TableName.SecretTag}Id` as const]: tag,
        [`${TableName.SecretV2}Id` as const]: secretId
      }))
    );
    if (newSecretTags.length) {
      const secTags = await secretTagDAL.saveTagsToSecretV2(newSecretTags, tx);
      const secVersionsGroupBySecId = groupBy(secretVersions, (i) => i.secretId);
      const newSecretVersionTags = secTags.flatMap(({ secrets_v2Id, secret_tagsId }) => ({
        [`${TableName.SecretVersionV2}Id` as const]: secVersionsGroupBySecId[secrets_v2Id][0].id,
        [`${TableName.SecretTag}Id` as const]: secret_tagsId
      }));
      await secretVersionTagDAL.insertMany(newSecretVersionTags, tx);
    }
  }

  const inputSecretIdsWithMetadata = inputSecrets
    .filter((sec) => Boolean(sec.data.secretMetadata))
    .map((sec) => sec.filter.id);

  await resourceMetadataDAL.delete(
    {
      $in: {
        secretId: inputSecretIdsWithMetadata
      }
    },
    tx
  );

  await resourceMetadataDAL.insertMany(
    inputSecrets.flatMap(({ filter: { id }, data: { secretMetadata } }) => {
      if (secretMetadata) {
        return secretMetadata.map(({ key, value }) => ({
          key,
          value,
          secretId: id,
          orgId
        }));
      }
      return [];
    }),
    tx
  );

  const secretsWithTags = await secretDAL.find(
    {
      $in: {
        [`${TableName.SecretV2}.id` as "id"]: newSecrets.map((s) => s.id)
      }
    },
    { tx }
  );

  const changes = secretVersions
    .filter(({ type }) => type === SecretType.Shared)
    .map((sv) => ({
      type: CommitType.ADD,
      isUpdate: true,
      secretVersionId: sv.id
    }));
  if (changes.length > 0) {
    if (commitChanges) {
      commitChanges.push(...changes);
    } else {
      await folderCommitService.createCommit(
        {
          actor: {
            type: actorType || ActorType.PLATFORM,
            metadata: {
              id: actor?.actorId
            }
          },
          message: "Secret Updated",
          folderId,
          changes
        },
        tx
      );
    }
  }

  return secretsWithTags.map((secret) => ({ ...secret, _id: secret.id }));
};
