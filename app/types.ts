export type Store = {
  id: number;
  name: string;
  reviewCount: number;
  averageRating: number | null;
  municipalityId: number | null;
  industryId: number | null;
  recruitingStatus: string | null;
};
export type Municipality = { id: number; name: string };
