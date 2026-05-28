import { Injectable, NotFoundException } from '@nestjs/common';

type ContentStatus = 'Idea' | 'Draft' | 'In Review' | 'Approved' | 'Published';

type ContentItem = {
  id: number;
  title: string;
  type: string;
  platform: string;
  status: ContentStatus;
  assignedTo: string;
  dueDate: string;
  priority: string;
};

@Injectable()
export class ContentService {
  private contentItems: ContentItem[] = [
    {
      id: 1,
      title: 'Placement roadmap carousel',
      type: 'Instagram Carousel',
      platform: 'Instagram',
      status: 'In Review',
      assignedTo: 'Content Intern',
      dueDate: '2026-05-30',
      priority: 'High',
    },
    {
      id: 2,
      title: 'Senior mentor success story',
      type: 'LinkedIn Post',
      platform: 'LinkedIn',
      status: 'Draft',
      assignedTo: 'Content Intern',
      dueDate: '2026-05-29',
      priority: 'Medium',
    },
  ];

  findAll() {
    return this.contentItems;
  }

  create(body: Partial<ContentItem>) {
    const newContent: ContentItem = {
      id: Date.now(),
      title: body.title || '',
      type: body.type || 'Instagram Carousel',
      platform: body.platform || 'Instagram',
      status: body.status || 'Idea',
      assignedTo: body.assignedTo || 'Not assigned',
      dueDate: body.dueDate || 'Not set',
      priority: body.priority || 'Medium',
    };

    this.contentItems.unshift(newContent);
    return newContent;
  }

  update(id: number, body: Partial<ContentItem>) {
    const contentIndex = this.contentItems.findIndex((item) => item.id === id);

    if (contentIndex === -1) {
      throw new NotFoundException('Content item not found');
    }

    this.contentItems[contentIndex] = {
      ...this.contentItems[contentIndex],
      ...body,
    };

    return this.contentItems[contentIndex];
  }

  remove(id: number) {
    const contentItem = this.contentItems.find((item) => item.id === id);

    if (!contentItem) {
      throw new NotFoundException('Content item not found');
    }

    this.contentItems = this.contentItems.filter((item) => item.id !== id);

    return {
      message: 'Content item deleted successfully',
      deletedContent: contentItem,
    };
  }
}