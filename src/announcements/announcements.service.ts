import { Injectable, NotFoundException } from '@nestjs/common';

type AnnouncementType = 'GENERAL' | 'MEETING' | 'DEADLINE' | 'URGENT';

type Announcement = {
  id: number;
  title: string;
  message: string;
  type: AnnouncementType;
};

@Injectable()
export class AnnouncementsService {
  private announcements: Announcement[] = [];

  findAll() {
    return this.announcements;
  }

  findLatest() {
    return this.announcements.length > 0 ? this.announcements[0] : null;
  }

  create(body: Partial<Announcement>) {
    const announcement: Announcement = {
      id: Date.now(),
      title: body.title || '',
      message: body.message || '',
      type: body.type || 'GENERAL',
    };

    this.announcements.unshift(announcement);

    return announcement;
  }

  update(id: number, body: Partial<Announcement>) {
    const index = this.announcements.findIndex(
      (announcement) => announcement.id === id,
    );

    if (index === -1) {
      throw new NotFoundException('Announcement not found');
    }

    this.announcements[index] = {
      ...this.announcements[index],
      ...body,
    };

    return this.announcements[index];
  }

  remove(id: number) {
    const announcement = this.announcements.find(
      (announcement) => announcement.id === id,
    );

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    this.announcements = this.announcements.filter(
      (announcement) => announcement.id !== id,
    );

    return {
      message: 'Announcement deleted successfully',
    };
  }
}