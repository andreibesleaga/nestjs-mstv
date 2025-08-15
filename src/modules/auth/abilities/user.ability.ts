import { AbilityBuilder, createMongoAbility, MongoAbility, InferSubjects } from '@casl/ability';

export interface User {
  id: string;
  email: string;
  role: string;
}

class UserEntity {
  id: string;
  email: string;
  role: string;
}

export type AppSubjects = InferSubjects<typeof UserEntity> | 'all';
export type AppAbility = MongoAbility<
  ['manage' | 'create' | 'read' | 'update' | 'delete', AppSubjects]
>;

export function defineAbilityFor(user: User): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (user.role === 'admin') {
    can('manage', 'all'); // admin can do anything
  } else {
    can('read', UserEntity); // everyone can read users
    can('update', UserEntity, { id: user.id }); // users can update themselves
    cannot('delete', UserEntity); // regular users cannot delete
  }

  return build();
}
