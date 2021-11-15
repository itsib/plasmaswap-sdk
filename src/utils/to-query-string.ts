/**
 * To convert simple object to query string
 * @param obj
 */
export function toQueryString(obj: object): string {
  const query = [];
  for (let key in obj) {
    if (obj.hasOwnProperty(key) && (obj as any)[key] !== undefined) {
      query.push(`${encodeURIComponent(key)}=${encodeURIComponent(`${(obj as any)[key]}`)}`);
    }
  }
  return query.join('&');
}
