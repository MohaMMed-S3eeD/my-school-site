import { NextResponse, NextRequest } from "next/server";
import { Year } from "@prisma/client";
import prisma from "@/utils/DB";
/**
 *  @method  GET
 *  @route   ~/api/years
 *  @desc    Get all years
 *  @access  public
 */


export async function GET(req: NextRequest) {
    try {
        console.log("hi ...................")
        const years = await prisma.year.findMany({
            include: {
                semesters: {
                    include: {
                        units: {
                            include: { lessons: true }
                        }
                    }
                }
            }
        });
        return NextResponse.json({ "years": years }, { status: 200 });
    } catch (error) {

        return NextResponse.json(
            { message: "internal server error", error },
            { status: 500 }
        )
    }
}

/**
 *  @method  POST
 *  @route   ~/api/years
 *  @desc    Get all years
 *  @access  public
 */

export async function POST(req: NextRequest) {
    try {
        console.log("hi ...................")
        const body = await req.json();
        const years: Year = await prisma.year.create({ data: body });
        return NextResponse.json({ "years": years }, { status: 200 });
    } catch (error) {

        return NextResponse.json(
            { message: "internal server error", error },
            { status: 500 }
        )
    }
}