export type Tone = 'good' | 'warning' | 'serious' | 'critical' | 'neutral';

export interface Status {
    key: string;
    label: string;
    tone?: Tone | undefined;
    color?: string | undefined;
}

export interface Project {
    id: string;
    name: string;
    logo?: string | undefined;
    color?: string | undefined;
    progress: number;
    counts?: Record<string, number> | undefined;
}

export interface Person {
    id: string;
    name: string;
    avatar?: string | undefined;
    color?: string | undefined;
    metric?: number | undefined;
    active?: boolean | undefined;
}

export interface Link {
    person: string;
    project: string;
    weight: number;
}

export interface GraphData {
    statuses?: Status[] | undefined;
    projects: Project[];
    people: Person[];
    links: Link[];
}

export interface Layout {
    width: number;
    height: number;
    padding: number;
    legend: number;
    personRadius: number;
}

export interface Area {
    x0: number;
    x1: number;
    y0: number;
    y1: number;
}

export interface Body {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    signature: string;
}

export interface ProjectNode extends Body {
    kind: 'project';
    data: Project;
    index: number;
    total: number;
}

export interface PersonNode extends Body {
    kind: 'person';
    data: Person;
    index: number;
}

export type GraphNode = ProjectNode | PersonNode;

export interface GraphLink {
    id: string;
    source: PersonNode;
    target: ProjectNode;
    weight: number;
    width: number;
    length: number;
}

export interface Gaps {
    project: number;
    mixed: number;
    person: number;
}

export interface Graph {
    nodes: GraphNode[];
    links: GraphLink[];
    byId: Map<string, GraphNode>;
    statuses: Status[];
    layout: Layout;
    area: Area;
    gaps: Gaps;
    added: number;
}

export interface Remembered {
    x: number;
    y: number;
    vx: number;
    vy: number;
    signature: string;
}

export type Memory = Map<string, Remembered>;

export interface Pulse {
    id: string;
    key: string;
}
