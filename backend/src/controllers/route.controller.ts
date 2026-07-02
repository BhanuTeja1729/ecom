import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { createError } from '../middleware/error';

const routeQuerySchema = z.object({
  startLat: z.string().transform(Number),
  startLng: z.string().transform(Number),
  endLat: z.string().transform(Number),
  endLng: z.string().transform(Number),
});

const DEFAULT_ORS_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjhkMmQyZTYwNDQ4MDRlNGU5ZGVmMGRmNGUwODQzMjNhIiwiaCI6Im11cm11cjY0In0=';

export async function getDirections(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = routeQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw createError('Invalid start or end coordinates provided.', 400);
    }

    const { startLat, startLng, endLat, endLng } = parsed.data;
    const apiKey = env.ORS_API_KEY || DEFAULT_ORS_KEY;

    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${startLng},${startLat}&end=${endLng},${endLat}`;

    const apiResponse = await fetch(url);
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('[ORS API Error]:', errorText);
      throw createError('Failed to fetch route directions from OpenRouteService.', apiResponse.status);
    }

    const data = (await apiResponse.json()) as any;

    const segment = data.features?.[0]?.properties?.segments?.[0];
    const geometry = data.features?.[0]?.geometry;

    if (!segment || !geometry) {
      throw createError('No drivable route found between the coordinates.', 404);
    }

    res.json({
      success: true,
      data: {
        distanceKm: (segment.distance / 1000).toFixed(1),
        durationMin: Math.round(segment.duration / 60),
        coordinates: geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]), // Convert [lng, lat] to Leaflet-friendly [lat, lng]
      },
    });
  } catch (err) {
    next(err);
  }
}
