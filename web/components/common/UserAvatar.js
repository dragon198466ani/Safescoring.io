/**
 * UserAvatar Component
 *
 * Reusable avatar component that displays user image or initials.
 * Eliminates duplicate avatar rendering code from:
 * - ButtonAccount.js (lines 72-86)
 * - ButtonSignin.js (lines 30-44)
 * - Leaderboard.js
 */

/* eslint-disable @next/next/no-img-element */

/**
 * Display user avatar with image or initials fallback
 *
 * @param {Object} props
 * @param {Object} props.user - User object with image, name, email
 * @param {string} props.size - Size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
 * @param {string} props.className - Additional classes
 */
export function UserAvatar({ user, size = "sm", className = "" }) {
  const sizeClasses = {
    xs: "w-4 h-4 text-xs",
    sm: "w-6 h-6 text-sm",
    md: "w-8 h-8 text-base",
    lg: "w-10 h-10 text-lg",
    xl: "w-12 h-12 text-xl",
  };

  const sizePixels = {
    xs: 16,
    sm: 24,
    md: 32,
    lg: 40,
    xl: 48,
  };

  const sizeClass = sizeClasses[size] || sizeClasses.sm;
  const pixels = sizePixels[size] || sizePixels.sm;

  // Get initials from name or email
  const getInitials = () => {
    if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "?";
  };

  if (user?.image) {
    return (
      <img
        src={user.image}
        alt={user.name || "User"}
        className={`${sizeClass} rounded-full shrink-0 object-cover ${className}`}
        referrerPolicy="no-referrer"
        width={pixels}
        height={pixels}
      />
    );
  }

  return (
    <span
      className={`${sizeClass} bg-base-300 flex justify-center items-center rounded-full shrink-0 font-medium ${className}`}
    >
      {getInitials()}
    </span>
  );
}

/**
 * Avatar with online status indicator
 */
export function UserAvatarWithStatus({ user, size = "sm", isOnline = false, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <UserAvatar user={user} size={size} />
      {isOnline && (
        <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-base-100" />
      )}
    </div>
  );
}

/**
 * Group of avatars (for showing team members, etc.)
 */
export function AvatarGroup({ users, max = 4, size = "sm" }) {
  const displayed = users.slice(0, max);
  const remaining = users.length - max;

  const sizeClasses = {
    xs: "w-4 h-4 text-xs -ml-1",
    sm: "w-6 h-6 text-sm -ml-2",
    md: "w-8 h-8 text-base -ml-2",
    lg: "w-10 h-10 text-lg -ml-3",
  };

  return (
    <div className="flex items-center">
      {displayed.map((user, i) => (
        <div
          key={user.id || i}
          className={`${i > 0 ? sizeClasses[size]?.split(" ").pop() : ""} ring-2 ring-base-100 rounded-full`}
        >
          <UserAvatar user={user} size={size} />
        </div>
      ))}
      {remaining > 0 && (
        <span
          className={`${sizeClasses[size]} bg-base-300 flex justify-center items-center rounded-full ring-2 ring-base-100 font-medium`}
        >
          +{remaining}
        </span>
      )}
    </div>
  );
}

export default UserAvatar;
